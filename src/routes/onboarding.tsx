import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { SwingoAppLogo } from "@/components/SwingoLogo";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your SWINGO profile" },
      { name: "description", content: "Tell Swingo your name and pick your theme to get started." },
      { property: "og:title", content: "Set up your SWINGO profile" },
      { property: "og:description", content: "Name and theme setup for SWINGO AI." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { session, profile, updateProfile, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (profile?.name && !name) setName(profile.name);
  }, [profile, name]);

  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => navigate({ to: "/" }), 2200);
    return () => clearTimeout(t);
  }, [step, navigate]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-72" />

      {step === 0 && (
        <div className="animate-rise w-full max-w-sm text-center">
          <SwingoAppLogo />
          <h1 className="mt-6 font-display text-2xl font-bold">What is your name?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Swingo will remember it forever.</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-6 w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-sm outline-none focus:border-ring"
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(1)}
            className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="animate-rise w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold">Choose your theme</h1>
          <p className="mt-2 text-sm text-muted-foreground">You can change this anytime.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors ${
                  theme === t ? "border-accent bg-surface" : "border-border"
                }`}
              >
                {t === "dark" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                <span className="text-sm font-medium capitalize">{t} Mode</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              await updateProfile({ name: name.trim(), theme, onboarded: true });
              setStep(2);
            }}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Finish setup
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise flex flex-col items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-10 w-10" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">Thank you, {name || "friend"}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Swingo is getting ready for you...</p>
        </div>
      )}
    </main>
  );
}
