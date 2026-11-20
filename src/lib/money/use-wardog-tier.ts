// Client view of a wallet's $WARDOG holder tier, read through the shared metric cache.
// Shows "checking" until a fresh on-chain read lands; never paints another wallet's or a stale tier.
import { useServerFn } from "@tanstack/react-start";
import { useCachedQuery } from "@/lib/cache/use-cached";
import { getWardogTierFn } from "./wardog.functions";
import { nextTier, wardogTier, type WardogTier } from "./wardog-pricing";

export const WARDOG_TIER_TTL = 60_000;
/** A tier read older than this is treated as unknown rather than shown. */
const MAX_AGE_MS = 3 * WARDOG_TIER_TTL;

export type WardogTierView =
  | { status: "no_wallet" }
  | { status: "checking" }
  | { status: "unavailable" }
  | { status: "ready"; balance: number; tier: WardogTier; next: { tier: WardogTier; needed: number } | null };

export function useWardogTier(owner: string | null | undefined): WardogTierView {
  const get = useServerFn(getWardogTierFn);
  const key = owner ? `wardog:tier:${owner}` : null;
  const { data, loading, error } = useCachedQuery(
    key,
    WARDOG_TIER_TTL,
    async () => ({ owner: owner!, ...(await get({ data: { owner: owner! } })) }),
    { refreshMs: WARDOG_TIER_TTL },
  );
  if (!owner) return { status: "no_wallet" };
  if (!data || data.owner !== owner) return error && !loading ? { status: "unavailable" } : { status: "checking" };
  if (data.balance == null || Date.now() - data.checkedAt > MAX_AGE_MS) return error ? { status: "unavailable" } : { status: "checking" };
  return { status: "ready", balance: data.balance, tier: wardogTier(data.balance), next: nextTier(data.balance) };
}
