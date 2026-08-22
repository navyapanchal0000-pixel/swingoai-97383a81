import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PLAN_LIST, type PlanId } from "@/lib/plans";
import type { Profile } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Master Admin — SWINGO" },
      {
        name: "description",
        content: "Master Admin dashboard for SWINGO: users, plans, chats and feedback tracking.",
      },
      { property: "og:title", content: "Master Admin — SWINGO" },
      { property: "og:description", content: "Manage SWINGO users, plans and feedback." },
    ],
  }),
  component: AdminPage,
});

type Msg = {
  id: string;
  chat_id: string;
  user_id: string;
  role: string;
  content: string;
  image_url: string | null;
  feedback: number | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [inspect, setInspect] = useState<Profile | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [loading, session, isAdmin, navigate]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const [{ data: profs }, { data: msgs }] = await Promise.all([
      supabase.from("profiles").select("*").order("last_login_at", { ascending: false }),
      supabase
        .from("messages")
        .select("id,chat_id,user_id,role,content,image_url,feedback,created_at")
        .order("created_at", { ascending: true }),
    ]);
    setUsers((profs as Profile[]) ?? []);
    setMessages((msgs as Msg[]) ?? []);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time sync across tabs
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, load]);

  const likes = messages.filter((m) => m.feedback === 1);
  const dislikes = messages.filter((m) => m.feedback === -1);
  const nameOf = (uid: string) => {
    const u = users.find((x) => x.id === uid);
    return `${u?.name ?? "Unknown"} · ${u?.email ?? uid.slice(0, 8)}`;
  };

  const assignPlan = async (uid: string, plan: PlanId, amount: number, unit: "days" | "months") => {
    const expires = new Date();
    if (unit === "days") expires.setDate(expires.getDate() + amount);
    else expires.setMonth(expires.getMonth() + amount);
    const { error } = await supabase
      .from("profiles")
      .update({ plan, plan_expires_at: plan === "free" ? null : expires.toISOString() })
      .eq("id", uid);
    if (error) toast.error(error.message);
    else toast.success("Plan updated instantly.");
    void load();
  };

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-background/85 px-3 backdrop-blur-xl">
        <Link
          to="/"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="h-5 w-5 text-accent" /> Master Admin
        </h1>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-2">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Users" value={users.length} />
          <Stat label="Likes" value={likes.length} />
          <Stat label="Dislikes" value={dislikes.length} />
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Users
          </h2>
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onInspect={() => setInspect(u)}
              onAssign={(plan, amount, unit) => void assignPlan(u.id, plan, amount, unit)}
            />
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Feedback tracking
          </h2>
          <div className="rounded-2xl border border-border">
            {[...likes, ...dislikes].length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No feedback yet.</p>
            )}
            {[...likes, ...dislikes].map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-3 border-b border-border/60 p-3 last:border-0"
              >
                {m.feedback === 1 ? (
                  <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{nameOf(m.user_id)}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{m.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {inspect && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <header className="flex h-14 items-center justify-between px-3">
            <p className="truncate text-sm font-semibold">{inspect.email}</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setInspect(null)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border/60"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="scroll-fast flex-1 space-y-3 overflow-y-auto px-4 pb-8">
            {messages
              .filter((m) => m.user_id === inspect.id)
              .map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-surface text-surface-foreground"
                  }`}
                >
                  {m.image_url ? (
                    <img src={m.image_url} alt="Generated" className="mb-2 rounded-xl" />
                  ) : null}
                  {m.content}
                </div>
              ))}
            {messages.filter((m) => m.user_id === inspect.id).length === 0 && (
              <p className="text-sm text-muted-foreground">No chats from this user yet.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border p-4 text-center">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function UserRow({
  user,
  onInspect,
  onAssign,
}: {
  user: Profile;
  onInspect: () => void;
  onAssign: (plan: PlanId, amount: number, unit: "days" | "months") => void;
}) {
  const [plan, setPlan] = useState<PlanId>((user.plan as PlanId) ?? "free");
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<"days" | "months">("months");

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name ?? "Unnamed"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last login: {new Date(user.last_login_at).toLocaleString()}
          </p>
          <p className="text-xs text-accent">
            {user.plan.toUpperCase()}
            {user.plan_expires_at
              ? ` · till ${new Date(user.plan_expires_at).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onInspect}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
        >
          View chats
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanId)}
          className="rounded-xl border border-border bg-surface px-2 py-1.5 text-xs"
        >
          {PLAN_LIST.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="rounded-xl border border-border bg-surface px-2 py-1.5 text-xs"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as "days" | "months")}
          className="rounded-xl border border-border bg-surface px-2 py-1.5 text-xs"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
        <button
          type="button"
          onClick={() => onAssign(plan, amount, unit)}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Assign
        </button>
      </div>
    </div>
  );
}
