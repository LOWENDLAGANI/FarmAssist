/**
 * AssistantWidget.tsx
 * ─────────────────────────────────────────────────────────────────
 * Floating AI assistant in the bottom-right corner.
 *
 * • Closed state: round mascot button (uses /mascot.png when you drop
 *   the file into /public; falls back to a sparkle icon until then).
 * • Open state: chat panel with mascot header, message bubbles,
 *   typing indicator, FAQ quick-select chips, and a free-text input.
 * • Styled with theme CSS variables so it adapts to all themes.
 * • Sits above the mobile BottomNav on small screens.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { useAssistant } from "@/hooks/useAssistant";
import { ASSISTANT_FAQS } from "@/lib/assistantFaq";

const MASCOT_SRC = "/mascot.png";
const ASSISTANT_NAME = "Hikari";
const GREETING =
  "Hi! I'm Hikari 🌱 Ask me anything about FarmAssist — pairing Rovers, sensor readings, alerts and more. Or tap a question below!";
const TEASER = "Need help? Ask me! 🌱";

export default function AssistantWidget() {
  const { messages, isTyping, send } = useAssistant();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [mascotOk, setMascotOk] = useState(true);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show a one-time teaser bubble after a short delay.
  useEffect(() => {
    if (open || sessionStorage.getItem("assistant-teaser-seen")) return;
    const t = setTimeout(() => setTeaserVisible(true), 4000);
    return () => clearTimeout(t);
  }, [open]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const toggleOpen = () => {
    setOpen((v) => !v);
    setTeaserVisible(false);
    sessionStorage.setItem("assistant-teaser-seen", "1");
  };

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    void send(trimmed);
  };

  return (
    <div
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-end gap-3 md:right-6 md:bottom-6"
      aria-live="polite"
    >
      {/* ── Chat panel ─────────────────────────────────────── */}
      {open && (
        <section
          aria-label={`${ASSISTANT_NAME} assistant chat`}
          className="animate-scale-in flex h-[min(60vh,28rem)] w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-2xl"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Header */}
          <header
            className="flex items-center gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--muted)" }}
          >
            <div className="relative shrink-0">
              <MascotAvatar className="h-10 w-10" ok={mascotOk} onError={() => setMascotOk(false)} />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[var(--card)] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{ASSISTANT_NAME}</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                FarmAssist helper · online
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOpen}
              aria-label="Close assistant"
              className="focus-ring rounded-lg p-1.5 transition-colors hover:bg-black/10"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <Bubble role="assistant">{GREETING}</Bubble>
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role}>
                {m.text}
              </Bubble>
            ))}
            {isTyping && (
              <div className="flex gap-1.5 rounded-2xl rounded-bl-sm px-3 py-2.5 w-fit"
                style={{ background: "var(--muted)" }}
                aria-label="Assistant is typing"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-pulse-dot"
                    style={{ animationDelay: `${i * 0.2}s`, color: "var(--muted-foreground)" }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* FAQ chips */}
          <div
            className="flex gap-2 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden"
            role="listbox"
            aria-label="Frequently asked questions"
          >
            {ASSISTANT_FAQS.map((faq) => (
              <button
                key={faq.label}
                type="button"
                onClick={() => submit(faq.question)}
                disabled={isTyping}
                className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-cyan-500/15 disabled:opacity-50 focus-ring"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--accent)",
                  background: "transparent",
                }}
              >
                {faq.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 border-t px-3 py-2.5"
            style={{ borderColor: "var(--border)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              maxLength={1000}
              aria-label="Message to assistant"
              className="min-h-9 flex-1 rounded-full border bg-transparent px-3.5 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)]"
              style={{ borderColor: "var(--border)" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      {/* ── Teaser bubble ──────────────────────────────────── */}
      {!open && teaserVisible && (
        <button
          type="button"
          onClick={toggleOpen}
          className="animate-fade-in max-w-44 rounded-2xl rounded-br-sm border px-3 py-2 text-xs font-medium shadow-lg"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          {TEASER}
        </button>
      )}

      {/* ── Mascot launcher button ─────────────────────────── */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={open ? "Close assistant" : "Open help assistant"}
        aria-expanded={open}
        className={`focus-ring relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95 ${
          open ? "" : "animate-glow-pulse"
        }`}
        style={{ background: open ? "var(--card)" : "var(--accent)" }}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MascotAvatar className="h-full w-full" ok={mascotOk} onError={() => setMascotOk(false)} />
        )}
      </button>
    </div>
  );
}

/**
 * Chat bubble. Assistant messages align left with a muted card;
 * user messages align right in the accent color.
 */
function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div
        className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white"
        style={{ background: "var(--accent)" }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm"
      style={{ background: "var(--muted)" }}
    >
      {children}
    </div>
  );
}

/**
 * Mascot image with graceful fallback to a sparkle icon until
 * /public/mascot.png exists (or if it fails to load).
 */
function MascotAvatar({
  className,
  ok,
  onError,
}: {
  className: string;
  ok: boolean;
  onError: () => void;
}) {
  if (!ok) {
    return (
      <span
        className={`flex items-center justify-center ${className}`}
        style={{ background: "var(--accent)" }}
      >
        <Sparkles className="h-6 w-6 text-white" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static asset with fallback handling
    <img src={MASCOT_SRC} alt="" className={`${className} object-cover`} onError={onError} />
  );
}
