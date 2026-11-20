// $WARDOG holder tier chip for the HUD and battle preview. Lists only perks the server applies.
import { Loader2, ShieldCheck, ShieldQuestion } from "lucide-react";
import { tierPerkLines } from "@/lib/money/wardog-pricing";
import type { WardogTierView } from "@/lib/money/use-wardog-tier";
import { cn } from "@/lib/utils";

export function WardogTierBadge({ view, detailed = false, className }: { view: WardogTierView; detailed?: boolean; className?: string }) {
  if (view.status === "no_wallet") return null;
  if (view.status === "checking") {
    return (
      <span className={cn("hud-chip text-muted-foreground", className)} aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" /> Tier checking…
      </span>
    );
  }
  if (view.status === "unavailable") {
    return (
      <span className={cn("hud-chip text-muted-foreground", className)} title="Couldn't read your WARDOG balance. No tier bonus is applied until it can be checked.">
        <ShieldQuestion className="h-3 w-3" /> Tier unavailable
      </span>
    );
  }
  const perks = tierPerkLines(view.tier);
  const ranked = view.tier.id !== "none";
  const hint = view.next ? `${view.next.needed.toLocaleString()} more WARDOG for ${view.next.tier.name}` : "Top tier reached";
  return (
    <span className={cn("inline-flex flex-col items-start gap-0.5", className)}>
      <span className={cn("hud-chip", ranked ? "neon-text-amber" : "text-muted-foreground")} title={[...perks, hint].join(" · ")}>
        <ShieldCheck className="h-3 w-3" /> {ranked ? view.tier.name : "No WARDOG tier"}
      </span>
      {detailed && (
        <span className="text-[0.6rem] text-muted-foreground">
          {perks.length ? `${perks.join(" · ")} · ` : ""}
          {hint}
        </span>
      )}
    </span>
  );
}
