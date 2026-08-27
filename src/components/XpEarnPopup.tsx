/**
 * XpEarnPopup.tsx
 * ─────────────────────────────────────────────────────────────────
 * Floating "+N XP" animation that pops up when the user earns XP.
 * Stacks multiple popups if XP is earned rapidly.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface XpEvent {
  id: number;
  amount: number;
  reason: string;
  icon: string;
}

interface XpEarnPopupProps {
  /** Fire-and-forget: push events here, they auto-dismiss. */
  events: XpEvent[];
}

export default function XpEarnPopup({ events }: XpEarnPopupProps) {
  const [visible, setVisible] = useState<XpEvent[]>([]);

  useEffect(() => {
    if (events.length === 0) return;

    // Add new events to visible list
    setVisible((prev) => [...prev, ...events]);

    // Auto-remove each event after animation
    for (const event of events) {
      const timer = setTimeout(() => {
        setVisible((prev) => prev.filter((e) => e.id !== event.id));
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [events]);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {visible.map((event) => (
        <div
          key={event.id}
          className="animate-xp-float flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/90 px-4 py-2 shadow-lg shadow-emerald-500/20 backdrop-blur-sm"
        >
          <span className="text-lg">{event.icon}</span>
          <span className="text-sm font-bold text-emerald-400">
            +{event.amount} XP
          </span>
          {event.reason && (
            <span className="text-[10px] text-emerald-300/60">
              {event.reason}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Helper: generate unique IDs for events ──
let _eventIdCounter = 0;
export function createXpEvent(
  amount: number,
  reason: string,
  icon: string
): XpEvent {
  return { id: ++_eventIdCounter, amount, reason, icon };
}
