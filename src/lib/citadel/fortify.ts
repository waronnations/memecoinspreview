// Citadel Fortifications: pure rules. Season-point boost is applied server-side at battle settlement.
export const CITADEL_MAX_LEVEL = 5;
/** Upgrade cost (WARDOG list price) to reach level n, index = target level. */
export const CITADEL_UPGRADE_COST: Record<number, number> = { 1: 500, 2: 1500, 3: 4000, 4: 10000, 5: 25000 };
/** Season point bonus per level (L0 = none). */
export const CITADEL_POINTS_BONUS = [0, 0.02, 0.04, 0.07, 0.1, 0.15] as const;

export function clampCitadelLevel(level: unknown): number {
  const n = Math.floor(Number(level));
  return Number.isFinite(n) ? Math.min(CITADEL_MAX_LEVEL, Math.max(0, n)) : 0;
}
export function citadelPointsMult(level: unknown): number {
  return 1 + CITADEL_POINTS_BONUS[clampCitadelLevel(level)];
}
/** List cost for the next level, or null when maxed. */
export function nextCitadelCost(level: unknown): number | null {
  const l = clampCitadelLevel(level);
  return l >= CITADEL_MAX_LEVEL ? null : CITADEL_UPGRADE_COST[l + 1];
}
