// One-tap "Get $WARDOG (20% OFF)" shortcut: opens the in-game quick swap with WARDOG pre-selected.
import { useState } from "react";
import { Zap } from "lucide-react";
import { TacticalModal } from "@/components/ui/TacticalModal";
import { QuickSwapPanel } from "@/components/dex/QuickSwapPanel";
import { WARDOG_DISCOUNT } from "@/lib/money/wardog-pricing";
import { cn } from "@/lib/utils";

export const GET_WARDOG_LABEL = `Get $WARDOG (${Math.round(WARDOG_DISCOUNT * 100)}% OFF)`;

export function GetWardogButton({ className, open: openProp, onOpenChange }: { className?: string; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setOpenState(v));
  return (
    <>
      <button type="button" onClick={() => { window.__lovableEvents?.track?.("project.quick_swap_launched", { source: "get_wardog" }); setOpen(true); }} className={cn("min-h-11 hit-cta cta-amber inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[0.65rem] font-black uppercase", className)}>
        <Zap className="h-3.5 w-3.5" /> {GET_WARDOG_LABEL}
      </button>
      <TacticalModal
        open={open}
        onClose={() => setOpen(false)}
        title={GET_WARDOG_LABEL}
        subtitle={`Everything you pay for with $WARDOG in the game costs ${Math.round(WARDOG_DISCOUNT * 100)}% less.`}
        badge="Quick swap"
        tone="amber"
      >
        <QuickSwapPanel initialTo="wardog" nested />
      </TacticalModal>
    </>
  );
}
