import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar, type ChatItem } from "@/components/AppSidebar";
import { MessageCard, type ChatMessage } from "@/components/MessageCard";
import { PromptBox } from "@/components/PromptBox";
import { SwingoMark } from "@/components/SwingoLogo";
import { useAuth } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/plans";
import { speak, stopSpeaking } from "@/lib/speech";
import { askSwingo, generateSwingoImage } from 

  export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SWINGO — AI assistant by Navya Panchal" },
      {
        name: "description",
        content:
          "Chat, generate images, solve maths and write code with SWINGO AI, built by Navya Panchal.",
      },
      { property: "og:title", content: "SWINGO — AI assistant by Navya Panchal" },
      {
        property: "og:description",
        content: "Chat, images, maths, code and live voice — all inside SWINGO AI.",
      }
      { property: "og:image", content: `${window.location.origin}/favicon.png` },
    ],
  }),
  component: Home,
});


type Mode = "chat" | "image" | "maths" | "code";

const IMAGE_RE =
  /\b(make|generate|create|draw|design|paint)\b[^.?!]{0,40}\b(image|picture|photo|logo|poster|wallpaper|art|illustration)\b/i;

function Home() {
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<Mode>("chat");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Swingo is thinking...");
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const plan = PLANS[(profile?.plan as PlanId) ?? "free"] ?? PLANS.free;

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [loading, session, profile, navigate]);

  const loadChats = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("chats")
      .select("id,title")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });
    setChats((data as ChatItem[]) ?? []);
  }, [session]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const loadMessages = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id,role,content,image_url,feedback")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
  }, []);

  // Realtime sync across tabs
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          void loadMessages(chatId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const buildMemory = useCallback(async () => {
    if (!session) return "";
    const { data } = await supabase
      .from("messages")
      .select("content")
      .eq("user_id", session.user.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(25);
    const facts = (data ?? []).map((m: { content: string }) => `- ${m.content.slice(0, 180)}`);
    return [
      profile?.name ? `The user's name is ${profile.name}.` : "",
      profile?.email ? `Their email is ${profile.email}.` : "",
      facts.length ? `Things they said before:\n${facts.reverse().join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [session, profile]);

  const ensureChat = useCallback(
    async (title: string) => {
      if (chatId) return chatId;
      if (!session) return null;
      const { data, error } = await supabase
        .from("chats")
        .insert({ user_id: session.user.id, title: title.slice(0, 48) || "New chat" })
        .select("id,title")
        .single();
      if (error || !data) return null;
      setChatId(data.id);
      setChats((c) => [data as ChatItem, ...c]);
      return data.id as string;
    },
    [chatId, session],
  );

  const handleSend = useCallback(
    async (text: string, files: File[]) => {
      if (!session || busy) return;
      const prompt = files.length
        ? `${text}\n\n[Attached: ${files.map((f) => f.name).join(", ")}]`
        : text;

      const id = await ensureChat(text);
      if (!id) {
        toast.error("Could not start the chat.");
        return;
      }

      const localUser: ChatMessage = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: prompt,
      };
      setMessages((m) => [...m, localUser]);
      await supabase
        .from("messages")
        .insert({ chat_id: id, user_id: session.user.id, role: "user", content: prompt });

      const wantsImage = mode === "image" || IMAGE_RE.test(text);
      setBusy(true);
      setBusyLabel(wantsImage ? "Swingo is making your image..." : "Swingo is thinking...");

      const started = Date.now();
      const minDelay = (wantsImage ? plan.imageSeconds : plan.chatSeconds) * 1000;

      try {
        if (wantsImage) {
          const { url } = await generateSwingoImage({
            data: {
              prompt: text,
              size: "1024x1024",
              format: (profile?.image_format as "png" | "jpg") ?? "png",
            },
          });
          await waitFor(minDelay - (Date.now() - started));
          await supabase.from("messages").insert({
            chat_id: id,
            user_id: session.user.id,
            role: "assistant",
            content: "Here is your image, made by Swingo.",
            image_url: url,
          });
        } else {
          const memory = await buildMemory();
          const history = [...messages, localUser].slice(-14).map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          }));
          const { text: answer } = await askSwingo({
            data: {
              messages: history,
              memory,
              mode: mode === "image" ? "chat" : mode,
            },
          });
          await waitFor(minDelay - (Date.now() - started));
          await supabase.from("messages").insert({
            chat_id: id,
            user_id: session.user.id,
            role: "assistant",
            content: answer,
          });
        }
        await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", id);
        await loadMessages(id);
        void loadChats();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [session, busy, ensureChat, mode, plan, profile, messages, buildMemory, loadMessages, loadChats],
  );

  const onFeedback = async (m: ChatMessage, value: 1 | -1) => {
    const next = m.feedback === value ? null : value;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, feedback: next } : x)));
    await supabase.from("messages").update({ feedback: next }).eq("id", m.id);
  };

  const onSpeak = (text: string) => {
    setSpeaking(true);
    speak(text, profile?.voice_tone ?? "aurora", () => setSpeaking(false));
  };

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="glow-top pointer-events-none fixed inset-x-0 top-0 h-64" />

      <AppHeader
        onOpenSidebar={() => setSidebarOpen(true)}
        speaking={speaking}
        onStopSpeaking={() => {
          stopSpeaking();
          setSpeaking(false);
        }}
      />

      <main className="scroll-fast relative mx-auto w-full max-w-3xl flex-1 px-4 pb-48">
        {empty ? (
          <div className="flex min-h-[62vh] flex-col items-center justify-center text-center">
            <img 
              src="/favicon.png" 
              alt="Swingo Logo" 
              style={{ height: '3.5cm', width: '3.5cm', objectFit: 'contain' }} 
            />
            <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-[0.26em]">
              Swingo
            </h1>
            <p className="mt-1.5 text-xs font-medium tracking-[0.2em] text-muted-foreground">
              By Navya Panchal
            </p>
            {mode !== "chat" && (
              <span className="mt-5 rounded-full border border-accent px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent">
                {mode} mode
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {messages.map((m) => (
              <MessageCard
                key={m.id}
                message={m}
                onFeedback={(v) => onFeedback(m, v)}
                onSpeak={onSpeak}
              />
            ))}
          </div>
        )}

        {busy && (
          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <SwingoMark className="h-7 w-7" spinning />
            {busyLabel}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <PromptBox onSend={handleSend} disabled={busy} />

      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={chatId}
        onSelectChat={(id) => {
          setChatId(id);
          void loadMessages(id);
        }}
        onNewChat={() => {
          setChatId(null);
          setMessages([]);
          setMode("chat");
        }}
        onMode={(m) => {
          setMode(m);
          setChatId(null);
          setMessages([]);
        }}
        onRename={async (id, title) => {
          setChats((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
          await supabase.from("chats").update({ title }).eq("id", id);
        }}
        onDelete={async (id) => {
          setChats((c) => c.filter((x) => x.id !== id));
          if (chatId === id) {
            setChatId(null);
            setMessages([]);
          }
          await supabase.from("chats").delete().eq("id", id);
        }}
        onShare={async (id) => {
          const url = `${window.location.origin}/?chat=${id}`;
          if (navigator.share) await navigator.share({ title: "Swingo chat", url });
          else {
            await navigator.clipboard.writeText(url);
            toast.success("Chat link copied");
          }
        }}
      />
    </div>
  );
}

function waitFor(ms: number) {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}
