/**
 * AdminPanelPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Dedicated admin-only panel. Only the single admin account (see
 * src/lib/adminConfig.ts) can open this page — everyone else gets an
 * access-denied notice.
 *
 * Currently hosts the Broadcast tool: compose a message and send it
 * to all users (or selected UIDs) as a banner, pop-up, or both.
 * Regular users never see this page; they only receive announcements
 * on the dashboard.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { push, update } from "firebase/database";
import {
  Megaphone,
  Send,
  X,
  Loader2,
  Check,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import {
  useBroadcasts,
  type BroadcastMode,
  type BroadcastAudience,
} from "@/hooks/useBroadcast";
import { broadcastsRef, broadcastRef } from "@/lib/firebaseConfig";
import { ADMIN_UID } from "@/lib/adminConfig";

const BROADCAST_MODES: Array<{ id: BroadcastMode; label: string; description: string }> = [
  { id: "banner", label: "Banner", description: "Top banner" },
  { id: "popup", label: "Popup", description: "Modal pop-up" },
  { id: "both", label: "Both", description: "Banner + pop-up" },
];

export default function AdminPanelPage() {
  const { user } = useAuth();
  const isAdmin = user?.uid === ADMIN_UID;

  const { broadcasts: allBroadcasts } = useBroadcasts(user?.uid ?? "", {
    includeInactive: true,
  });
  const activeBroadcast = allBroadcasts.find((b) => b.active) ?? null;

  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastMode, setBroadcastMode] = useState<BroadcastMode>("banner");
  const [broadcastAudience, setBroadcastAudience] = useState<"all" | "specific">("all");
  const [broadcastUids, setBroadcastUids] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [stoppingBroadcast, setStoppingBroadcast] = useState<string | null>(null);

  const handleSendBroadcast = async () => {
    const msg = broadcastText.trim();
    if (!user || !msg) return;
    const audience: BroadcastAudience =
      broadcastAudience === "specific"
        ? { uids: broadcastUids.split(",").map((s) => s.trim()).filter(Boolean) }
        : "all";
    if (audience !== "all" && audience.uids.length === 0) return;
    setSendingBroadcast(true);
    try {
      await push(broadcastsRef(), {
        message: msg,
        mode: broadcastMode,
        createdAt: Date.now(),
        audience,
        active: true,
        sentBy: user.uid,
      });
      setBroadcastText("");
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 2000);
    } catch (err) {
      console.error("[AdminPanel] Failed to send broadcast:", err);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleStopBroadcast = async (id: string) => {
    setStoppingBroadcast(id);
    try {
      await update(broadcastRef(id), { active: false });
    } catch (err) {
      console.error("[AdminPanel] Failed to stop broadcast:", err);
    } finally {
      setStoppingBroadcast(null);
    }
  };

  // ── Access gate ─────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          <p className="text-sm text-slate-400">Restricted area</p>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center animate-fade-in">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-400" />
          <h3 className="mt-3 text-sm font-semibold text-white">Access denied</h3>
          <p className="mt-1 text-xs text-slate-400">
            This page is reserved for the admin account only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Admin Panel</h2>
        <p className="text-sm text-slate-400">
          Tools available only to the admin account
        </p>
      </div>

      {/* ── Broadcast tool ── */}
      <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <Megaphone className="h-4 w-4 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Broadcast</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Announce a message on every user&apos;s dashboard as a banner, pop-up, or both.
            </p>
          </div>
          {activeBroadcast && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              LIVE
            </span>
          )}
        </div>

        <textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Type your broadcast message…"
          className="w-full resize-none rounded-xl border border-cyan-500/30 bg-[#0a1628] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-slate-500">{broadcastText.length}/280</p>

        {/* Display mode selector */}
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-400">Show as</p>
          <div className="grid grid-cols-3 gap-2">
            {BROADCAST_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setBroadcastMode(mode.id)}
                className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                  broadcastMode === mode.id
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-cyan-500/30 hover:text-slate-200"
                }`}
              >
                <span className="block text-sm font-semibold">{mode.label}</span>
                <span className="block text-[10px] text-slate-500">{mode.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audience selector */}
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-400">Send to</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBroadcastAudience("all")}
              className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                broadcastAudience === "all"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-cyan-500/30 hover:text-slate-200"
              }`}
            >
              <span className="block text-sm font-semibold">Everyone</span>
              <span className="block text-[10px] text-slate-500">All users</span>
            </button>
            <button
              type="button"
              onClick={() => setBroadcastAudience("specific")}
              className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                broadcastAudience === "specific"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-cyan-500/30 hover:text-slate-200"
              }`}
            >
              <span className="block text-sm font-semibold">Specific users</span>
              <span className="block text-[10px] text-slate-500">By account UID</span>
            </button>
          </div>
          {broadcastAudience === "specific" && (
            <input
              type="text"
              value={broadcastUids}
              onChange={(e) => setBroadcastUids(e.target.value)}
              placeholder="User UIDs, comma-separated"
              className="mt-2 w-full rounded-xl border border-cyan-500/30 bg-[#0a1628] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
            />
          )}
        </div>

        {/* Send / stop actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={
              sendingBroadcast ||
              !broadcastText.trim() ||
              (broadcastAudience === "specific" &&
                broadcastUids.split(",").map((s) => s.trim()).filter(Boolean).length === 0)
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sendingBroadcast ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : broadcastSent ? (
              <Check className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sendingBroadcast ? "Sending…" : broadcastSent ? "Sent!" : "Send Broadcast"}
          </button>
          {activeBroadcast && (
            <button
              type="button"
              onClick={() => handleStopBroadcast(activeBroadcast.id)}
              disabled={stoppingBroadcast === activeBroadcast.id}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {stoppingBroadcast === activeBroadcast.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Stop
            </button>
          )}
        </div>

        {/* Broadcast history */}
        {allBroadcasts.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recent broadcasts
            </p>
            {allBroadcasts.slice(0, 5).map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2.5 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    b.active ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                />
                <p className="min-w-0 flex-1 truncate text-xs text-slate-300">{b.message}</p>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {b.audience === "all"
                    ? "Everyone"
                    : `${b.audience.uids.length} user${b.audience.uids.length === 1 ? "" : "s"}`}
                  {" · "}
                  {b.mode === "both"
                    ? "Banner + Popup"
                    : b.mode === "banner"
                      ? "Banner"
                      : "Popup"}
                </span>
                {b.active && (
                  <button
                    type="button"
                    onClick={() => handleStopBroadcast(b.id)}
                    disabled={stoppingBroadcast === b.id}
                    title="Stop this broadcast"
                    aria-label="Stop this broadcast"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {stoppingBroadcast === b.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    Stop
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-400">
            Only the admin account can send broadcasts. Other users only see them on their dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}