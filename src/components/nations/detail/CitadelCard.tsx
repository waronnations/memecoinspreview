// Citadel Fortification card: level, season-point boost, next WARDOG cost (20% off) and vault progress.
import { useState } from "react";
import { Castle } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { upgradeCitadelFn } from "@/lib/nations.functions";
import { CITADEL_MAX_LEVEL, CITADEL_POINTS_BONUS, clampCitadelLevel, nextCitadelCost } from "@/lib/citadel/fortify";
import { WARDOG_DISCOUNT, wardogPrice } from "@/lib/money/wardog-pricing";
import type { NationDetails } from "../use-nations-panel";

export function citadelCardState(level: unknown, vaultWardog: number, myRole: string | null | undefined) {
  const l = clampCitadelLevel(level);
  const list = nextCitadelCost(l);
  const cost = list === null ? null : wardogPrice(list);
  const canManage = myRole === "leader" || myRole === "officer";
  const short = cost !== null && vaultWardog < cost;
  return {
    level: l,
    boost: CITADEL_POINTS_BONUS[l],
    nextBoost: l < CITADEL_MAX_LEVEL ? CITADEL_POINTS_BONUS[l + 1] : null,
    list,
    cost,
    progress: cost ? Math.min(1, vaultWardog / cost) : 1,
    canManage,
    short,
    canFortify: canManage && cost !== null && !short,
  };
}

export function CitadelCard({
  selected,
  onUpgraded,
  onTopUp,
}: {
  selected: NationDetails;
  onUpgraded: () => void;
  onTopUp: () => void;
}) {
  const upgrade = useServerFn(upgradeCitadelFn);
  const [busy, setBusy] = useState(false);
  const st = citadelCardState(selected.citadelLevel, Number(selected.vaultWardog || 0), selected.myRole);
  const pct = (n: number) => `+${Math.round(n * 100)}%`;

  const fortify = async () => {
    setBusy(true);
    try {
      const r = await upgrade();
      toast.success(`Citadel fortified to L${r.level}`);
      onUpgraded();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m.includes("insufficient_vault") ? "Insufficient Vault $WARDOG" : m.includes("authority") ? "Leaders and Officers only" : "Fortify failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="holo-panel p-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="hud-title flex items-center gap-2 text-neon-cyan">
          <Castle className="h-4 w-4" /> Citadel Fortification
        </div>
        <span className="hud-chip">L{st.level} / L{CITADEL_MAX_LEVEL}</span>
      </div>
      <div className="mt-2 text-sm">
        <span className="text-muted-foreground">Season point boost:</span>{" "}
        <span className="font-mono font-black neon-text-amber">{pct(st.boost)}</span>
        {st.nextBoost !== null && <span className="text-xs text-muted-foreground"> → {pct(st.nextBoost)} next</span>}
      </div>
      {st.cost === null ? (
        <div className="mt-2 text-xs text-neon-green font-bold">Citadel fully fortified</div>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Next upgrade:</span>
            <span className="font-mono font-black">{st.cost.toLocaleString()} $WARDOG</span>
            <span className="text-xs text-muted-foreground line-through">{st.list?.toLocaleString()}</span>
            <span className="hud-chip">-{Math.round(WARDOG_DISCOUNT * 100)}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden" aria-label="Upgrade progress">
            <div className="h-full bg-primary" style={{ width: `${st.progress * 100}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Vault {Number(selected.vaultWardog || 0).toFixed(0)} / {st.cost.toLocaleString()} $WARDOG
          </div>
          {st.canManage ? (
            st.short ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-destructive">Insufficient Vault $WARDOG</span>
                <button onClick={onTopUp} className="hit-cta cta-amber px-3">Top up vault</button>
              </div>
            ) : (
              <button onClick={fortify} disabled={busy} className="hit-cta cta-deploy mt-3 w-full">
                {busy ? "Fortifying…" : "Fortify Citadel"}
              </button>
            )
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">Only Leaders and Officers can fortify.</div>
          )}
        </>
      )}
    </div>
  );
}
