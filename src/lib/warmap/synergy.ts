// War Map → Coin Board synergy (pure): a coin whose faction holds Citadel Dominance on the
// LIVE map earns boosted season points. Simulation tiles never feed this.
import { citadelMultiplier } from "@/lib/syndicate/rules";
import { MAP_FACTIONS } from "./tiles";

export function factionOf(symbol: string | null | undefined): string | null {
  const s = (symbol ?? "").replace(/^\$/, "").trim().toUpperCase();
  return (MAP_FACTIONS as readonly string[]).includes(s) ? s : null;
}

/**
 * Multiplier for points credited to `symbol` given live map shares (1 when no dominance).
 * `citadelBoost` (WARDOG Apex tier) makes the faction's share count that much higher.
 */
export function synergyMult(symbol: string | null | undefined, shares: Record<string, number>, citadelBoost = 0): number {
  const f = factionOf(symbol);
  return f ? citadelMultiplier((shares[f] ?? 0) * (1 + Math.max(0, citadelBoost))) : 1;
}

/** Season points after Citadel synergy and the WARDOG holder Battle Glory multiplier. */
export const boostPoints = (
  points: number,
  symbol: string | null | undefined,
  shares: Record<string, number>,
  tier: { gloryMult?: number; citadelBoost?: number } = {},
) => Math.round(points * synergyMult(symbol, shares, tier.citadelBoost ?? 0) * (tier.gloryMult ?? 1) * 100) / 100;
