import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PLAN_LIST, type Plan } from "@/lib/plans";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans & pricing — SWINGO" },
      {
        name: "description",
        content: "Free, Pro at ₹69/month and Premium at ₹99/month — pick your SWINGO AI speed.",
      },
      { property: "og:title", content: "Plans & pricing — SWINGO" },
      { property: "og:description", content: "Free, Pro ₹69 and Premium ₹99 SWINGO AI plans." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { profile, updateProfile } = useAuth();
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-background/80 px-3 backdrop-blur-xl">
        <Link
          to="/settings"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-bold">Plans</h1>
      </header>

      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 pt-3 sm:grid-cols-3">
        {PLAN_LIST.map((p) => {
          const active = profile?.plan === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-3xl border p-5 ${active ? "border-accent bg-surface" : "border-border bg-card"}`}
            >
              <p className="font-display text-lg font-bold">{p.name}</p>
              <p className="mt-1 text-2xl font-bold text-metal">{p.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-accent" /> Chat in {p.chatSeconds}s
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-accent" /> Images in {p.imageSeconds}s
                </li>
                {p.limits.map((l) => (
                  <li key={l} className="flex gap-2">
                    <Check className="h-4 w-4 text-accent" /> {l}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={active}
                onClick={() => (p.priceValue === 0 ? void updateProfile({ plan: "free" }) : setSelected(p))}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {active ? "Current plan" : p.priceValue === 0 ? "Switch to Free" : "Buy / Subscribe"}
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6">
          <div className="animate-rise w-full max-w-sm rounded-3xl border border-border bg-popover p-5 text-popover-foreground shadow-[var(--shadow-float)]">
            <p className="font-display text-lg font-bold">{selected.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{selected.price}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {selected.limits.map((l) => (
                <li key={l}>• {l}</li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const expires = new Date();
                  expires.setMonth(expires.getMonth() + 1);
                  await updateProfile({ plan: selected.id, plan_expires_at: expires.toISOString() });
                  toast.success(`${selected.name} activated!`);
                  setSelected(null);
                }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
