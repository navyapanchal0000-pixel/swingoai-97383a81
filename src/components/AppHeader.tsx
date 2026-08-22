import { Menu, MoreHorizontal, Square } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/plans";

export function AppHeader({
  onOpenSidebar,
  speaking,
  onStopSpeaking,
}: {
  onOpenSidebar: () => void;
  speaking?: boolean;
  onStopSpeaking?: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const plan = PLANS[(profile?.plan as PlanId) ?? "free"] ?? PLANS.free;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenSidebar}
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-transparent text-foreground transition-transform active:scale-90"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="font-display text-lg font-bold uppercase tracking-[0.22em] text-foreground">
          Swingo
        </span>

        <div className="relative">
          <button
            type="button"
            aria-label="More"
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-transparent text-foreground transition-transform active:scale-90"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="animate-rise absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-float)]">
                <p className="font-display text-sm font-semibold">Swingo by Navya Panchal</p>
                <p className="mt-1 text-xs text-muted-foreground">Active plan</p>
                <p className="text-sm font-medium text-accent">{plan.name}</p>
              </div>
            </>
          )}

          {speaking && (
            <button
              type="button"
              aria-label="Stop speaking"
              onClick={onStopSpeaking}
              className="animate-rise absolute right-1 top-12 grid h-9 w-9 place-items-center rounded-full bg-foreground text-background shadow-[var(--shadow-float)]"
            >
              <Square className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
