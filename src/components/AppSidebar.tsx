import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Code2,
  ImagePlus,
  MessageSquarePlus,
  Search,
  Settings,
  Sigma,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

export type ChatItem = { id: string; title: string };

export function AppSidebar({
  open,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onMode,
  onRename,
  onDelete,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  chats: ChatItem[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onMode: (mode: "image" | "maths" | "code") => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}) {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menuFor, setMenuFor] = useState<ChatItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = chats.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  const startPress = (chat: ChatItem) => {
    timer.current = setTimeout(() => setMenuFor(chat), 480);
  };
  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-background transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ willChange: "transform" }}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            aria-label="Back to home"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-display text-base font-bold uppercase tracking-[0.2em]">Swingo</span>
        </div>

        <nav className="space-y-1 px-3">
          <SidebarRow
            icon={<MessageSquarePlus className="h-4.5 w-4.5" />}
            label="New Chat"
            onClick={() => {
              onNewChat();
              onClose();
            }}
          />
          <SidebarRowButton
            icon={<Search className="h-4.5 w-4.5" />}
            label="Search Chat"
            onClick={() => setSearching((s) => !s)}
          />
          {searching && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your chats"
              className="mb-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
            />
          )}
          <SidebarRowButton
            icon={<ImagePlus className="h-4.5 w-4.5" />}
            label="Image Generation"
            onClick={() => {
              onMode("image");
              onClose();
            }}
          />
          <SidebarRowButton
            icon={<Sigma className="h-4.5 w-4.5" />}
            label="MATHS"
            onClick={() => {
              onMode("maths");
              onClose();
            }}
          />
          <SidebarRowButton
            icon={<Code2 className="h-4.5 w-4.5" />}
            label="CodeX"
            onClick={() => {
              onMode("code");
              onClose();
            }}
          />
        </nav>

        <p className="px-5 pb-2 pt-5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Recent
        </p>
        <div className="scroll-fast min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">No chats yet.</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelectChat(c.id);
                onClose();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(c);
              }}
              onTouchStart={() => startPress(c)}
              onTouchEnd={endPress}
              onMouseDown={() => startPress(c)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              className={`block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                activeChatId === c.id
                  ? "bg-surface text-surface-foreground"
                  : "text-muted-foreground hover:bg-surface/60"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {(profile?.name ?? user?.email ?? "S").slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border"
          >
            <Settings className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>

      {menuFor && (
        <div className="fixed inset-0 z-60 grid place-items-end bg-foreground/30 p-4 pb-8 sm:place-items-center">
          <div className="animate-rise w-full max-w-sm rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-float)]">
            <p className="truncate px-4 py-3 text-sm font-medium">{menuFor.title}</p>
            <PopupRow
              label="Share"
              onClick={() => {
                onShare(menuFor.id);
                setMenuFor(null);
              }}
            />
            <PopupRow
              label="Rename"
              onClick={() => {
                const t = window.prompt("Rename chat", menuFor.title);
                if (t) onRename(menuFor.id, t);
                setMenuFor(null);
              }}
            />
            <PopupRow
              label="Delete"
              danger
              onClick={() => {
                onDelete(menuFor.id);
                setMenuFor(null);
              }}
            />
            <PopupRow label="Back" onClick={() => setMenuFor(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarRowButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface"
    >
      {icon}
      {label}
    </button>
  );
}

const SidebarRow = SidebarRowButton;

function PopupRow({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface ${
        danger ? "text-danger" : "text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
