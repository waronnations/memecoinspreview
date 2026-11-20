// Pure rules for settling queued WARDOG burns on-chain. Browser-safe and unit-tested.
import { Address, beginCell, type Cell } from "@ton/core";
import { assertBurnAddress } from "@/lib/onchain/burn-address";

/** Jetton standard (TEP-74) transfer op. */
export const JETTON_TRANSFER_OP = 0x0f8a7ea5;
/** A claimed batch with no confirmation after this long is checked on-chain, then released. */
export const STALE_CLAIM_MS = 30 * 60_000;
export const MAX_BATCH_ROWS = 100;

export type PendingBurn = { id: number; burnAmount: number };

/** Whole WARDOG -> jetton units (9 decimals), floored so we never send more than recorded. */
export function toJettonUnits(amount: number, decimals = 9): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return 0n;
  const [i = "0", f = ""] = amount.toFixed(decimals).split(".");
  return BigInt(i) * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}

/** Comment carried in the transfer so the batch can be matched on-chain. */
export const batchComment = (batchId: string) => `BURN:${batchId}`;

/**
 * Picks the oldest pending rows whose total fits the treasury balance.
 * Returns null (fail closed) when nothing fits, so we never send a partial or overdrawn batch.
 */
export function planBurnBatch(rows: PendingBurn[], treasuryBalance: number, maxRows = MAX_BATCH_ROWS) {
  const picked: PendingBurn[] = [];
  let total = 0;
  for (const r of rows.slice(0, maxRows)) {
    if (!(r.burnAmount > 0)) continue;
    if (total + r.burnAmount > treasuryBalance + 1e-9) break;
    picked.push(r);
    total += r.burnAmount;
  }
  return picked.length ? { rows: picked, total: Math.round(total * 1e9) / 1e9 } : null;
}

/** TEP-74 transfer body that moves `units` of WARDOG to the canonical burn address. */
export function buildBurnTransferBody(units: bigint, responseTo: string, batchId: string, queryId = BigInt(Date.now())): Cell {
  if (units <= 0n) throw new Error("burn_amount_zero");
  const dest = Address.parse(assertBurnAddress());
  const forward = beginCell().storeUint(0, 32).storeStringTail(batchComment(batchId)).endCell();
  return beginCell()
    .storeUint(JETTON_TRANSFER_OP, 32)
    .storeUint(queryId, 64)
    .storeCoins(units)
    .storeAddress(dest)
    .storeAddress(Address.parse(responseTo))
    .storeBit(false)
    .storeCoins(1n)
    .storeBit(true)
    .storeRef(forward)
    .endCell();
}
