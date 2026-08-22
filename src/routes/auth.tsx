import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SwingoAppLogo } from "@/components/SwingoLogo";
import { MASTER_EMAIL, MASTER_PASSWORD } from "@/lib/plans";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to SWINGO" },
      { name: "description", content: "Log in or sign up to use SWINGO AI by Navya Panchal." },
      { property: "og:title", content: "Sign in to SWINGO" },
      { property: "og:description", content: "Log in or sign up to use SWINGO AI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, profile, isAdmin } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (isAdmin) navigate({ to: "/admin" });
    else if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
    else if (profile) navigate({ to: "/" });
  }, [session, profile, isAdmin, navigate]);

  const isMaster = email.trim().toLowerCase() === MASTER_EMAIL && password === MASTER_PASSWORD;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isMaster) {
        // Master Admin bypass — sign in, creating the account on first use.
        let res = await supabase.auth.signInWithPassword({ email: MASTER_EMAIL, password });
        if (res.error) {
          await supabase.auth.signUp({
            email: MASTER_EMAIL,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
          res = await supabase.auth.signInWithPassword({ email: MASTER_EMAIL, password });
        }
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        await supabase.from("profiles").update({ onboarded: true }).eq("id", res.data.user!.id);
        navigate({ to: "/admin" });
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created! Setting up your profile...");
        navigate({ to: "/onboarding" });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          toast.error("First you sign up then log in");
        } else {
          toast.error(error.message);
        }
        return;
      }
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding" });
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-72" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center">
          <SwingoAppLogo />
          <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-[0.28em]">
            Swingo
          </h1>
          <p className="mt-1 text-xs font-medium tracking-[0.18em] text-muted-foreground">
            By Navya Panchal
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full py-2 text-sm font-medium transition-colors ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={google}
            className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-surface-foreground transition-transform active:scale-[0.98]"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </main>
  );
}
