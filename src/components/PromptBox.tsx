import { Mic, Plus, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SwingoLiveButtonIcon } from "./SwingoLogo";

export function PromptBox({
  onSend,
  disabled,
}: {
  onSend: (text: string, files: File[]) => void;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const hasContent = value.trim().length > 0 || files.length > 0;

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    if (!hasContent || disabled) return;
    onSend(value.trim(), files);
    setValue("");
    setFiles([]);
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!Ctor) return;
    type Rec = {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      start: () => void;
      stop: () => void;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
    };
    const rec = new (Ctor as new () => Rec)();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setValue(t);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      style={{ paddingLeft: "0.5cm", paddingRight: "0.4cm" }}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)]);
        }}
        className={`pointer-events-auto mx-auto w-full max-w-3xl rounded-3xl border bg-composer shadow-[var(--shadow-float)] transition-colors ${
          dragging ? "border-accent" : "border-border"
        }`}
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs text-surface-foreground"
              >
                {f.name.slice(0, 22)}
                <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 p-2">
          <button
            type="button"
            aria-label="Attach"
            onClick={() => inputRef.current?.click()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-composer-foreground/70 transition-transform active:scale-90"
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.csv"
            onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])}
          />

          <div className="min-w-0 flex-1 py-1.5">
            {listening ? (
              <div className="flex h-6 items-end gap-[3px]">
                {Array.from({ length: 22 }).map((_, i) => (
                  <span
                    key={i}
                    className="animate-wave w-[3px] rounded-full bg-accent"
                    style={{ height: "100%", animationDelay: `${(i % 7) * 0.08}s` }}
                  />
                ))}
              </div>
            ) : (
              <textarea
                ref={textRef}
                rows={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask Swingo"
                className="max-h-[140px] w-full resize-none bg-transparent text-[15px] leading-6 text-composer-foreground outline-none placeholder:text-composer-foreground/45"
              />
            )}
          </div>

          <button
            type="button"
            aria-label={listening ? "Stop recording" : "Voice input"}
            onClick={toggleMic}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90 ${
              listening ? "bg-danger text-danger-foreground" : "text-composer-foreground/70"
            }`}
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            type="button"
            aria-label={hasContent ? "Send" : "Swingo Live"}
            onClick={() => (hasContent ? submit() : navigate({ to: "/live" }))}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90"
          >
            {hasContent ? <Send className="h-4 w-4" /> : <SwingoLiveButtonIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
