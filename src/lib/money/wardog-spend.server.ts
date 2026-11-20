// Every in-game $WARDOG spend: 50% queued for the verified burn address, 50% into the
// War Vault's current cycle pool. Each spend writes one audit row (amount, purpose). Server-only.
import { sql } from "@/lib/db/client.server";
import { WARDOG_CA } from "@/lib/tokens";
import { TON_BURN_ADDRESS, assertBurnAddress } from "@/lib/onchain/burn-address";
import { splitWardogSpend, type WardogPurpose } from "./wardog-pricing";

let ready: Promise<void> | null = null;

export function ensureWardogBurnTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS wardog_burns (
          id           BIGSERIAL PRIMARY KEY,
          user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
          purpose      TEXT NOT NULL,
          spent        NUMERIC(38,9) NOT NULL,
          burn_amount  NUMERIC(38,9) NOT NULL,
          vault_amount NUMERIC(38,9) NOT NULL,
          burn_address TEXT NOT NULL,
          status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','void')),
          tx_hash      TEXT,
          details      JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`CREATE INDEX IF NOT EXISTS wardog_burns_status_idx ON wardog_burns (status, created_at DESC)`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/**
 * Records a completed WARDOG spend. Never throws: the player's purchase already went
 * through, so a ledger failure is logged loudly (with every field) instead of undoing it.
 */
export async function recordWardogSpend(params: {
  userId: number | null;
  amount: number;
  purpose: WardogPurpose;
  details?: Record<string, unknown>;
}): Promise<{ burn: number; vault: number } | null> {
  const split = splitWardogSpend(params.amount);
  if (split.spent <= 0) return null;
  const event = { event: "wardog_burn", purpose: params.purpose, userId: params.userId, ...split };
  try {
    const burnAddress = assertBurnAddress(TON_BURN_ADDRESS);
    await ensureWardogBurnTable();
    const { ensureVaultTables, fundPool } = await import("@/lib/vault/vault.server");
    await ensureVaultTables();
    await sql`
      INSERT INTO vault_assets (asset_key, symbol, kind, decimals, min_claim)
      VALUES (${WARDOG_CA}, 'WARDOG', 'jetton', 9, 1)
      ON CONFLICT (asset_key) DO NOTHING`;
    await sql`
      INSERT INTO wardog_burns (user_id, purpose, spent, burn_amount, vault_amount, burn_address, details)
      VALUES (${params.userId}, ${params.purpose}, ${split.spent}, ${split.burn}, ${split.vault}, ${burnAddress}, ${JSON.stringify(params.details ?? {})}::jsonb)`;
    await fundPool(WARDOG_CA, split.vault);
    console.info(JSON.stringify(event));
    return { burn: split.burn, vault: split.vault };
  } catch (e) {
    console.error(JSON.stringify({ ...event, error: e instanceof Error ? e.message : String(e), details: params.details ?? {} }));
    return null;
  }
}

/** Public, aggregate-only burn totals (no player identifiers). */
export async function wardogBurnTotals(): Promise<{ burned: number; toVault: number; events: number }> {
  await ensureWardogBurnTable();
  const { rows } = await sql`
    SELECT COALESCE(SUM(burn_amount),0)::float8 AS burned, COALESCE(SUM(vault_amount),0)::float8 AS vault, COUNT(*)::int AS n
    FROM wardog_burns WHERE status <> 'void'`;
  const r = rows[0] ?? {};
  return { burned: Number(r["burned"] ?? 0), toVault: Number(r["vault"] ?? 0), events: Number(r["n"] ?? 0) };
}
