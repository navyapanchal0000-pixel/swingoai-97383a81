import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Moon, ShieldCheck, Sun, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { PLANS, VOICE_TONES, type PlanId } from "@/lib/plans";
import { speak } from "@/lib/speech";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SWINGO" },
      { name: "description", content: "Theme, image format, voice tone and plan settings for SWINGO." },
      { property: "og:title", content: "Settings — SWINGO" },
      { property: "og:description", content: "Personalise your SWINGO AI experience." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { session, profile, isAdmin, updateProfile, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const plan = PLANS[(profile?.plan as PlanId) ?? "free"] ?? PLANS.free;

  const signOut = async () => {
    await supabase.auth.signOut();
    setConfirmOut(false);
    toast.success("You have been signed out.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-background/80 px-3 backdrop-blur-xl">
        <Link
          to="/"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-bold">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-2">
        <Section title="Appearance">
          <div className="grid grid-cols-2 gap-3">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  void updateProfile({ theme: t });
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium capitalize ${
                  theme === t ? "border-accent bg-surface" : "border-border"
                }`}
              >
                {t === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {t} Mode
              </button>
            ))}
          </div>
        </Section>

        <Section title="Image format">
          <div className="grid grid-cols-2 gap-3">
            {(["png", "jpg"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => void updateProfile({ image_format: f })}
                className={`rounded-2xl border p-4 text-sm font-medium uppercase ${
                  profile?.image_format === f ? "border-accent bg-surface" : "border-border"
                }`}
              >
                .{f}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Voice tone">
          <div className="space-y-2">
            {VOICE_TONES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  void updateProfile({ voice_tone: v.id });
                  speak("Hey, how can I assist you?", v.id);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
                  profile?.voice_tone === v.id ? "border-accent bg-surface" : "border-border"
                }`}
              >
                {v.label}
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Section>

        <Section title="Your plan">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.price}</p>
            </div>
            <Link
              to="/plans"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Upgrade
            </Link>
          </div>
        </Section>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-2xl border border-accent bg-surface px-4 py-4 text-sm font-semibold"
          >
            <ShieldCheck className="h-5 w-5 text-accent" />
            Master Admin Settings
          </Link>
        )}

        <button
          type="button"
          onClick={() => setConfirmOut(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-4 text-sm font-semibold text-danger"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>

      {confirmOut && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6">
          <div className="animate-rise w-full max-w-xs rounded-3xl border border-border bg-popover p-5 text-center text-popover-foreground shadow-[var(--shadow-float)]">
            <p className="font-display text-base font-semibold">Sign out of Swingo?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Click OK to complete your sign out.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOut(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={signOut}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
