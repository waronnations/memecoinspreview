// $WARDOG economy (pure, browser-safe): one source of truth for WARDOG pricing,
// the 50/50 burn/War Vault split of every in-game WARDOG spend, and holder tiers.
// Holder perks only list effects the server applies at settlement (see `honored`).

export type WardogPurpose = "armory" | "war_map_sector" | "citadel_fortify" | "nation_buff" | "nation_protection" | "ai_generation";

/** Paying with $WARDOG costs 20% less than the same action in USD₮/GRAM/other tokens. */
export const WARDOG_DISCOUNT = 0.2;
/** Share of every in-game WARDOG spend sent to the burn address; the rest funds the War Vault. */
export const WARDOG_BURN_SHARE = 0.5;
/** Ledger precision (matches normalizeToken: 4 decimals). */
const SCALE = 10_000;

const toUnits = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n * SCALE) : 0);
const fromUnits = (u: number) => u / SCALE;

/** Price of an action when paid with $WARDOG, given its list price in the same token units. */
export function wardogPrice(listPrice: number): number {
  const u = toUnits(listPrice);
  return fromUnits(Math.round(u * (1 - WARDOG_DISCOUNT)));
}

/** WARDOG needed for an action listed in another currency, or null when either price is unknown. */
export function wardogPriceFromQuote(listAmount: number, listUsdPrice: number | null, wardogUsdPrice: number | null): number | null {
  if (!(listAmount > 0) || !(listUsdPrice! > 0) || !(wardogUsdPrice! > 0)) return null;
  const usd = listAmount * listUsdPrice! * (1 - WARDOG_DISCOUNT);
  const out = Math.ceil((usd / wardogUsdPrice!) * SCALE) / SCALE;
  return out > 0 ? out : null;
}

/** Splits a spend exactly: burn + vault always equals the (4-dp) amount spent. */
export function splitWardogSpend(amount: number): { spent: number; burn: number; vault: number } {
  const u = toUnits(amount);
  const burn = Math.floor(u * WARDOG_BURN_SHARE);
  return { spent: fromUnits(u), burn: fromUnits(burn), vault: fromUnits(u - burn) };
}

// ── Holder tiers ──────────────────────────────────────────────────────
export type WardogTierId = "none" | "dog_soldier" | "pack_leader" | "apex_warlord";
export type WardogTier = {
  id: WardogTierId;
  name: string;
  min: number;
  /** Extra Battle Glory (Coin Board season points) per settled battle. */
  glory: number;
  /** Faction map share counts this much higher for Citadel Dominance. */
  citadel: number;
  /** Faster recon missions. */
  recon: number;
  /** War Map defense. */
  mapDefense: number;
};

export const WARDOG_TIERS: readonly WardogTier[] = [
  { id: "apex_warlord", name: "Apex Warlord", min: 50_000, glory: 0.3, citadel: 0.1, recon: 0, mapDefense: 0 },
  { id: "pack_leader", name: "Pack Leader", min: 10_000, glory: 0.2, citadel: 0, recon: 0, mapDefense: 0.05 },
  { id: "dog_soldier", name: "Dog Soldier", min: 1_000, glory: 0.1, citadel: 0, recon: 0.1, mapDefense: 0 },
];
export const NO_TIER: WardogTier = { id: "none", name: "No tier", min: 0, glory: 0, citadel: 0, recon: 0, mapDefense: 0 };

/**
 * Perks the server actually applies. Recon missions and War Map defense don't exist yet,
 * so those perks stay off (and hidden) until a mechanic honors them.
 */
export const HONORED_PERKS = { glory: true, citadel: true, recon: false, mapDefense: false } as const;

/** Tier for a verified on-chain balance; unknown balance (null) never grants a tier. */
export function wardogTier(balance: number | null | undefined): WardogTier {
  if (balance == null || !Number.isFinite(balance) || balance < 0) return NO_TIER;
  return WARDOG_TIERS.find((t) => balance >= t.min) ?? NO_TIER;
}

/** Glory multiplier the server applies at settlement (1 when no tier). */
export const tierGloryMult = (t: WardogTier) => (HONORED_PERKS.glory ? 1 + t.glory : 1);
/** Citadel share boost the server applies at settlement (0 when no tier). */
export const tierCitadelBoost = (t: WardogTier) => (HONORED_PERKS.citadel ? t.citadel : 0);

/** Human-readable perks, honored ones only, so the UI never promises a bonus. */
export function tierPerkLines(t: WardogTier): string[] {
  const out: string[] = [];
  const pct = (n: number) => `+${Math.round(n * 100)}%`;
  if (HONORED_PERKS.glory && t.glory > 0) out.push(`${pct(t.glory)} Battle Glory`);
  if (HONORED_PERKS.citadel && t.citadel > 0) out.push(`${pct(t.citadel)} Citadel Dominance`);
  if (HONORED_PERKS.recon && t.recon > 0) out.push(`${pct(t.recon)} Recon speed`);
  if (HONORED_PERKS.mapDefense && t.mapDefense > 0) out.push(`${pct(t.mapDefense)} War Map defense`);
  return out;
}

/** Next tier up and how much more WARDOG it needs, or null at the top. */
export function nextTier(balance: number | null): { tier: WardogTier; needed: number } | null {
  if (balance == null) return null;
  const up = [...WARDOG_TIERS].reverse().find((t) => balance < t.min);
  return up ? { tier: up, needed: Math.ceil((up.min - balance) * 100) / 100 } : null;
}
