// Verified on-chain $WARDOG balance for a wallet (TonAPI). Server-only.
// Returns null whenever the chain can't be read, so callers grant no tier instead of guessing.
import { Address } from "@ton/core";
import { WARDOG_CA } from "@/lib/tokens";

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; balance: number | null }>();

export async function getWardogBalance(owner: string): Promise<number | null> {
  let raw: string;
  try {
    raw = Address.parse(owner).toRawString();
  } catch {
    return null;
  }
  const hit = cache.get(raw);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.balance;
  const key = process.env.TONAPI_KEY;
  try {
    const res = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(raw)}/jettons/${encodeURIComponent(WARDOG_CA)}`, {
      headers: key ? { Accept: "application/json", Authorization: `Bearer ${key}` } : { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    // 404 = this wallet has never held WARDOG.
    if (res.status === 404) {
      cache.set(raw, { at: Date.now(), balance: 0 });
      return 0;
    }
    if (!res.ok) return hit?.balance ?? null;
    const body = (await res.json()) as { balance?: string; jetton?: { decimals?: number } };
    const decimals = Number(body.jetton?.decimals ?? 9);
    const units = BigInt(body.balance ?? "0");
    const balance = Number(units) / 10 ** decimals;
    if (!Number.isFinite(balance)) return null;
    cache.set(raw, { at: Date.now(), balance });
    return balance;
  } catch {
    return null;
  }
}
