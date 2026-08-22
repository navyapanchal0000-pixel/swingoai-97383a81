import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, CameraOff, Mic, MicOff, MonitorUp, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SwingoMark } from "@/components/SwingoLogo";
import { useAuth } from "@/lib/auth";
import { askSwingo } from "@/lib/ai.functions";
import { speak, stopSpeaking } from "@/lib/speech";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Swingo Live — voice & vision" },
      {
        name: "description",
        content: "Talk to SWINGO AI live with voice, captions, camera and screen sharing.",
      },
      { property: "og:title", content: "Swingo Live — voice & vision" },
      { property: "og:description", content: "Live voice and vision mode inside SWINGO AI." },
    ],
  }),
  component: LivePage,
});

type Turn = { role: "user" | "assistant"; content: string };

function LivePage() {
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [caption, setCaption] = useState("Tap the mic and start talking to Swingo.");
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [sharing, setSharing] = useState(false);
  const [thinking, setThinking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const setStream = useCallback((stream: MediaStream | null) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopSpeaking();
    };
  }, []);

  const respond = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const next: Turn[] = [...turnsRef.current, { role: "user", content: text }];
      setTurns(next);
      setThinking(true);
      setCaption("Swingo is thinking...");
      try {
        const { text: answer } = await askSwingo({
          data: {
            messages: next.slice(-12),
            memory: profile?.name ? `The user's name is ${profile.name}.` : "",
            mode: "live",
          },
        });
        setTurns((t) => [...t, { role: "assistant", content: answer }]);
        setCaption(answer);
        speak(answer, profile?.voice_tone ?? "aurora");
      } catch (e) {
        setCaption(e instanceof Error ? e.message : "Swingo could not answer.");
      } finally {
        setThinking(false);
      }
    },
    [profile],
  );

  const toggleMic = () => {
    if (micOn) {
      recRef.current?.stop();
      setMicOn(false);
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input is not supported on this browser.");
      return;
    }
    type Rec = {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      start: () => void;
      stop: () => void;
      onresult: (e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void;
      onend: () => void;
    };
    const rec = new (Ctor as new () => Rec)();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) void respond(r[0].transcript);
        else interim += r[0].transcript;
      }
      if (interim) setCaption(interim);
    };
    rec.onend = () => setMicOn(false);
    rec.start();
    recRef.current = rec;
    setMicOn(true);
    setCaption("Listening...");
  };

  const toggleCam = async () => {
    if (camOn && !sharing) {
      setStream(null);
      setCamOn(false);
      return;
    }
    try {
      const nextFacing = camOn ? (facing === "user" ? "environment" : "user") : facing;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
      });
      setStream(stream);
      setFacing(nextFacing);
      setCamOn(true);
      setSharing(false);
    } catch {
      toast.error("Camera access was blocked.");
    }
  };

  const toggleShare = async () => {
    if (sharing) {
      setStream(null);
      setSharing(false);
      setCamOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setStream(stream);
      setSharing(true);
      setCamOn(true);
    } catch {
      toast.error("Screen sharing was cancelled.");
    }
  };

  const endCall = async () => {
    recRef.current?.stop();
    stopSpeaking();
    setStream(null);
    if (session && turnsRef.current.length) {
      const { data: chat } = await supabase
        .from("chats")
        .insert({ user_id: session.user.id, title: "Swingo Live session" })
        .select("id")
        .single();
      if (chat) {
        await supabase.from("messages").insert(
          turnsRef.current.map((t) => ({
            chat_id: chat.id,
            user_id: session.user.id,
            role: t.role,
            content: t.content,
          })),
        );
      }
      toast.success("Live session saved to your chat history.");
    }
    navigate({ to: "/" });
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${camOn ? "" : "hidden"}`}
        />
        {!camOn && (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4">
            <SwingoMark className="h-24 w-24" spinning={thinking} />
            <p className="font-display text-xl font-bold uppercase tracking-[0.26em]">
              Swingo Live
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-28 px-5">
          <p className="mx-auto max-w-2xl rounded-2xl bg-foreground/85 px-4 py-3 text-center text-sm leading-relaxed text-background">
            {caption}
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-center gap-4 bg-background/85 px-4 py-5 backdrop-blur-xl">
        <Circle label="Camera" onClick={() => void toggleCam()} active={camOn && !sharing}>
          {camOn && !sharing ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
        </Circle>
        <Circle label="Share screen" onClick={() => void toggleShare()} active={sharing}>
          <MonitorUp className="h-5 w-5" />
        </Circle>
        <Circle label="Mic" onClick={toggleMic} active={micOn}>
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Circle>
        <button
          type="button"
          aria-label="End call"
          onClick={() => void endCall()}
          className="grid h-14 w-14 place-items-center rounded-full text-white shadow-[var(--shadow-float)] transition-transform active:scale-90"
          style={{ backgroundColor: "#FF2222" }}
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </main>
  );
}

function Circle({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-12 w-12 place-items-center rounded-full border transition-transform active:scale-90 ${
        active
          ? "border-accent bg-surface text-accent"
          : "border-border bg-surface text-surface-foreground"
      }`}
    >
      {children}
    </button>
  );
}
