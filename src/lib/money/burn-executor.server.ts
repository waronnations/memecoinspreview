// Settles queued WARDOG burns on-chain from the treasury hot wallet. Fail-closed: refuses
// without money config, the wallet mnemonic, or enough treasury WARDOG. Rows are claimed in
// a batch before sending, so a row can never be sent twice; stale claims are checked
// on-chain (by batch comment) before being released back to pending.
import { Address, internal, SendMode, toNano } from "@ton/core";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { sql } from "@/lib/db/client.server";
import { WARDOG_CA } from "@/lib/tokens";
import { requireMoney, moneyLog } from "./config.server";
import { ensureWardogBurnTable } from "./wardog-spend.server";
import { batchComment, buildBurnTransferBody, planBurnBatch, STALE_CLAIM_MS, toJettonUnits } from "./burn-executor";

let migrated: Promise<void> | null = null;
function ensureBurnColumns() {
  if (!migrated) {
    migrated = (async () => {
      await ensureWardogBurnTable();
      await sql`ALTER TABLE wardog_burns ADD COLUMN IF NOT EXISTS batch_id TEXT`;
      await sql`ALTER TABLE wardog_burns ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`;
      await sql`ALTER TABLE wardog_burns ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ`;
      await sql`ALTER TABLE wardog_burns ADD COLUMN IF NOT EXISTS error TEXT`;
      await sql`ALTER TABLE wardog_burns DROP CONSTRAINT IF EXISTS wardog_burns_status_check`;
      await sql`ALTER TABLE wardog_burns ADD CONSTRAINT wardog_burns_status_check CHECK (status IN ('pending','claimed','sent','settled','void'))`;
      await sql`CREATE INDEX IF NOT EXISTS wardog_burns_batch_idx ON wardog_burns (batch_id) WHERE batch_id IS NOT NULL`;
    })().catch((e) => { migrated = null; throw e; });
  }
  return migrated;
}

const net = () => (process.env["TON_NETWORK"] === "testnet" ? "testnet." : "");
async function tonapi<T>(path: string, key: string): Promise<T | null> {
  const r = await fetch(`https://${net()}tonapi.io/v2${path}`, { headers: { Authorization: `Bearer ${key}` } });
  return r.ok ? ((await r.json()) as T) : null;
}

type JettonHistory = { events?: Array<{ event_id: string; actions?: Array<{ JettonTransfer?: { comment?: string } }> }> };
async function findBatchTx(wallet: string, batchId: string, key: string): Promise<string | null> {
  const h = await tonapi<JettonHistory>(`/accounts/${encodeURIComponent(wallet)}/jettons/${encodeURIComponent(WARDOG_CA)}/history?limit=100`, key);
  const want = batchComment(batchId);
  const ev = h?.events?.find((e) => e.actions?.some((a) => a.JettonTransfer?.comment === want));
  return ev?.event_id ?? null;
}

export async function executePendingBurns() {
  const cfg = requireMoney("wardog_burn");
  const mnemonic = process.env["BURN_WALLET_MNEMONIC"] ?? process.env["OWNER_MNEMONIC"];
  if (!mnemonic) {
    moneyLog("refused", { path: "wardog_burn", code: "config_incomplete", missing: ["BURN_WALLET_MNEMONIC"] });
    throw new Error("config_incomplete: BURN_WALLET_MNEMONIC");
  }
  await ensureBurnColumns();
  const key = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
  const contract = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
  const wallet = contract.address.toString({ bounceable: false });

  // 1) Confirm sent/claimed batches on-chain; release stale unconfirmed claims.
  const open = await sql`SELECT DISTINCT batch_id, MIN(claimed_at) AS claimed_at FROM wardog_burns WHERE status IN ('claimed','sent') AND batch_id IS NOT NULL GROUP BY batch_id`;
  let settled = 0;
  for (const b of open.rows) {
    const batchId = String(b["batch_id"]);
    const tx = await findBatchTx(wallet, batchId, cfg.tonapiKey);
    if (tx) {
      const r = await sql`UPDATE wardog_burns SET status = 'settled', tx_hash = ${tx}, settled_at = NOW(), error = NULL WHERE batch_id = ${batchId} AND status IN ('claimed','sent')`;
      settled += r.rowCount;
    } else if (Date.now() - new Date(String(b["claimed_at"])).getTime() > STALE_CLAIM_MS) {
      await sql`UPDATE wardog_burns SET status = 'pending', batch_id = NULL, claimed_at = NULL, error = 'released_unconfirmed' WHERE batch_id = ${batchId} AND status IN ('claimed','sent')`;
    }
  }
  // Never start a new batch while one is still in flight.
  const inflight = await sql`SELECT 1 FROM wardog_burns WHERE status IN ('claimed','sent') LIMIT 1`;
  if (inflight.rows[0]) return { settled, sent: 0, reason: "batch_in_flight" as const };

  // 2) Check treasury balance and claim the next batch.
  const j = await tonapi<{ balance?: string; wallet_address?: { address?: string } }>(`/accounts/${encodeURIComponent(wallet)}/jettons/${encodeURIComponent(WARDOG_CA)}`, cfg.tonapiKey);
  const jettonWallet = j?.wallet_address?.address;
  const balance = j?.balance ? Number(j.balance) / 1e9 : 0;
  if (!jettonWallet) throw new Error("treasury_balance_unavailable");
  const pending = await sql`SELECT id, burn_amount::float8 AS b FROM wardog_burns WHERE status = 'pending' ORDER BY created_at, id LIMIT 100`;
  const plan = planBurnBatch(pending.rows.map((r) => ({ id: Number(r["id"]), burnAmount: Number(r["b"]) })), balance);
  if (!plan) {
    if (pending.rows.length) moneyLog("refused", { path: "wardog_burn", code: "treasury_insufficient", balance });
    return { settled, sent: 0, reason: pending.rows.length ? ("treasury_insufficient" as const) : ("nothing_pending" as const) };
  }
  const batchId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const ids = plan.rows.map((r) => r.id);
  const claim = await sql`UPDATE wardog_burns SET status = 'claimed', batch_id = ${batchId}, claimed_at = NOW() WHERE status = 'pending' AND id = ANY(${ids}::bigint[]) RETURNING id, burn_amount::float8 AS b`;
  if (claim.rows.length !== ids.length) {
    await sql`UPDATE wardog_burns SET status = 'pending', batch_id = NULL, claimed_at = NULL WHERE batch_id = ${batchId}`;
    return { settled, sent: 0, reason: "claim_race" as const };
  }
  const total = claim.rows.reduce((s, r) => s + Number(r["b"]), 0);

  // 3) Send one jetton transfer for the whole batch.
  try {
    const client = new TonClient({ endpoint: `https://${net()}toncenter.com/api/v2/jsonRPC`, apiKey: process.env["TONCENTER_API_KEY"] });
    const w = client.open(contract);
    const seqno = await w.getSeqno();
    await w.sendTransfer({
      seqno,
      secretKey: key.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [internal({ to: Address.parse(jettonWallet), value: toNano("0.06"), body: buildBurnTransferBody(toJettonUnits(total), wallet, batchId) })],
    });
    await sql`UPDATE wardog_burns SET status = 'sent' WHERE batch_id = ${batchId} AND status = 'claimed'`;
    moneyLog("wardog_burn_sent", { batchId, rows: ids.length, total });
    return { settled, sent: ids.length, total, batchId };
  } catch (e) {
    // Sending may or may not have reached the chain: keep the claim; step 1 checks on-chain before release.
    await sql`UPDATE wardog_burns SET error = ${e instanceof Error ? e.message.slice(0, 200) : "send_failed"} WHERE batch_id = ${batchId}`;
    throw e;
  }
}
