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

import { useState, useEffect } from "react";
import { push, update, set, remove, onValue, off, type DataSnapshot } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Megaphone,
  Send,
  X,
  Loader2,
  Check,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Search,
  UserX,
  Ban,
  ShieldOff,
  Users,
  Trash2,
  Lock,
  Unlock,
  MonitorSmartphone,
  MonitorUp,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import {
  useBroadcasts,
  type BroadcastMode,
  type BroadcastAudience,
} from "@/hooks/useBroadcast";
import {
  app,
  broadcastsRef,
  broadcastRef,
  inviteCodeRef,
  inviteConfigRef,
  bansRef,
  remoteControlRef,
} from "@/lib/firebaseConfig";
import { ADMIN_UID } from "@/lib/adminConfig";
import {
  BAN_DURATIONS,
  formatBanDuration,
  formatBanExpiry,
  isBanActive,
  parseBanRecord,
  type BanRecord,
  type SearchUserResult,
} from "@/lib/bans";

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

  // ── Ban tool state ──
  const [banLookupMode, setBanLookupMode] = useState<"name" | "uid">("name");
  const [banQuery, setBanQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
  const [banDurationMs, setBanDurationMs] = useState(BAN_DURATIONS[4].ms); // default: 3 days
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const [banActionMsg, setBanActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [unbanning, setUnbanning] = useState<string | null>(null);
  const [allBans, setAllBans] = useState<
    Array<{ uid: string; record: BanRecord; active: boolean }>
  >([]);

  // ── Remote page control state ──
  // When sent, every device signed into this admin's account follows
  // the chosen page instantly (live Firebase listener on each device).
  const [remotePage, setRemotePage] = useState<string | null>(null);
  const [sendingRemote, setSendingRemote] = useState<string | null>(null);
  const [remoteSent, setRemoteSent] = useState<string | null>(null);

  // Live list of every ban record (admin-only read rule).
  useEffect(() => {
    const ref = bansRef();
    const handle = onValue(
      ref,
      (snap: DataSnapshot) => {
        const data = snap.val() as Record<
          string,
          Record<string, unknown>
        > | null;
        const list: Array<{ uid: string; record: BanRecord; active: boolean }> =
          [];
        if (data) {
          for (const [uid, raw] of Object.entries(data)) {
            const record = parseBanRecord(raw);
            if (!record) continue;
            list.push({ uid, record, active: isBanActive(record) });
          }
        }
        list.sort((a, b) => b.record.bannedAt - a.record.bannedAt);
        setAllBans(list);
      },
      (err) => {
        // Read denied — almost always means the new database rules are not deployed yet.
        console.error("[AdminPanel] Failed to read bans:", err);
      }
    );
    return () => off(ref, "value", handle);
  }, []);

  // ── Invite code state ──
  const [currentInviteCode, setCurrentInviteCode] = useState<string | null>(null);
  const [inviteCodeDraft, setInviteCodeDraft] = useState("");
  const [savingInviteCode, setSavingInviteCode] = useState(false);
  const [inviteCodeSaved, setInviteCodeSaved] = useState(false);
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);

  // ── Registration mode state (invite-only vs. open) ──
  const [inviteRequired, setInviteRequired] = useState(true);
  const [inviteConfigLoaded, setInviteConfigLoaded] = useState(false);
  const [savingInviteConfig, setSavingInviteConfig] = useState(false);
  const [inviteConfigError, setInviteConfigError] = useState<string | null>(null);

  // Listen for the registration mode (public read rule; admin-only write).
  useEffect(() => {
    const ref = inviteConfigRef();
    const handle = onValue(
      ref,
      (snap: DataSnapshot) => {
        const data = snap.val() as { required?: unknown } | null;
        setInviteRequired(data?.required !== false);
        setInviteConfigLoaded(true);
        setInviteConfigError(null);
      },
      (err) => {
        console.error("[AdminPanel] Failed to read invite config:", err);
        setInviteConfigError(
          "Couldn't load the registration mode — this usually means the updated database rules haven't been deployed yet (firebase deploy --only database)."
        );
      }
    );
    return () => off(ref, "value", handle);
  }, []);

  // Listen for the current invite code (admin-only read rule).
  useEffect(() => {
    const ref = inviteCodeRef();
    const handle = onValue(ref, (snap: DataSnapshot) => {
      const data = snap.val();
      const code = data?.code;
      setCurrentInviteCode(typeof code === "string" && code.trim() ? code : null);
      setInviteCodeDraft(typeof code === "string" && code.trim() ? code : "");
    }, (err) => {
      // Read denied — almost always means the new database rules were not deployed yet.
      console.error("[AdminPanel] Failed to read invite code:", err);
      setInviteCodeError(
        "Couldn't load the invite code — this usually means the updated database rules haven't been deployed yet (firebase deploy --only database)."
      );
    });
    return () => off(ref, "value", handle);
  }, []);

  /** Random, easy-to-share code like FARM-8K2M9Q. */
  const generateInviteCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    const chars = new Uint32Array(6);
    crypto.getRandomValues(chars);
    let code = "";
    for (const n of chars) code += alphabet[n % alphabet.length];
    setInviteCodeDraft(`FARM-${code}`);
    setInviteCodeSaved(false);
    setInviteCodeError(null);
  };

  /** Persist the registration mode (invite-only vs. open). */
  const handleSetInviteRequired = async (next: boolean) => {
    if (!user || !inviteConfigLoaded || savingInviteConfig) return;
    setSavingInviteConfig(true);
    setInviteConfigError(null);
    try {
      await set(inviteConfigRef(), {
        required: next,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      });
    } catch (err) {
      console.error("[AdminPanel] Failed to update registration mode:", err);
      setInviteConfigError(
        "Couldn't update the registration mode — this usually means the updated database rules haven't been deployed yet (firebase deploy --only database)."
      );
    } finally {
      setSavingInviteConfig(false);
    }
  };

  const handleSaveInviteCode = async () => {
    const code = inviteCodeDraft.trim();
    if (!user || !code) return;
    setSavingInviteCode(true);
    setInviteCodeError(null);
    try {
      await set(inviteCodeRef(), {
        code,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      });
      setInviteCodeSaved(true);
      setTimeout(() => setInviteCodeSaved(false), 2000);
    } catch (err) {
      console.error("[AdminPanel] Failed to save invite code:", err);
      setInviteCodeError(
        "Couldn't save the invite code — this usually means the updated database rules haven't been deployed yet (firebase deploy --only database)."
      );
    } finally {
      setSavingInviteCode(false);
    }
  };

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

  // ── Remote page control ──
  // Mirror of what every device is listening to, so the admin can see
  // the last command issued and release it.
  useEffect(() => {
    if (!user) return;
    const commandRef = remoteControlRef(user.uid);
    const unsubscribe = onValue(commandRef, (snap: DataSnapshot) => {
      const raw = snap.val() as { page?: unknown } | null;
      setRemotePage(typeof raw?.page === "string" && raw.page ? raw.page : null);
    });
    return () => unsubscribe();
  }, [user]);

  const REMOTE_PAGES: Array<{ id: string; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "control", label: "Control" },
    { id: "notifications", label: "Notifications" },
    { id: "history", label: "History" },
    { id: "settings", label: "Settings" },
    { id: "about", label: "About" },
  ];

  const handleSendRemotePage = async (page: string) => {
    if (!user || sendingRemote) return;
    setSendingRemote(page);
    setRemoteSent(null);
    try {
      await set(remoteControlRef(user.uid), {
        page,
        issuedAt: Date.now(),
        issuedBy: user.uid,
      });
      setRemotePage(page);
      setRemoteSent(page);
      setTimeout(() => setRemoteSent((cur) => (cur === page ? null : cur)), 2000);
    } catch (err) {
      console.error("[AdminPanel] Failed to send remote page command:", err);
    } finally {
      setSendingRemote(null);
    }
  };

  const handleReleaseRemote = async () => {
    if (!user) return;
    try {
      await remove(remoteControlRef(user.uid));
      setRemotePage(null);
    } catch (err) {
      console.error("[AdminPanel] Failed to release remote control:", err);
    }
  };

  // ── Ban tool callables (region must match the deployed functions) ──
  const functions = getFunctions(app, "asia-southeast1");
  const searchUsersFn = httpsCallable<{ query: string }, { users: SearchUserResult[] }>(
    functions,
    "searchUsers"
  );
  const banUserFn = httpsCallable<
    { uid: string; durationMs: number; reason: string },
    { banned: boolean }
  >(functions, "banUser");
  const unbanUserFn = httpsCallable<{ uid: string }, { unbanned: boolean }>(
    functions,
    "unbanUser"
  );

  /** Pull the server's message out of a httpsCallable error. */
  const callableError = (err: unknown): string => {
    const e = err as { code?: string; message?: string } | null;
    if (!e?.message) return "Something went wrong. Please try again.";
    const stripped = e.message.match(/^[a-z-]+(?:\(\d*\))?\s*,\s*(.*)$/);
    return stripped ? stripped[1] : e.message;
  };

  const handleSearchUsers = async () => {
    const q = banQuery.trim();
    if (!q || searchingUsers) return;
    setSearchingUsers(true);
    setSearchError(null);
    setHasSearched(false);
    try {
      const res = await searchUsersFn({ query: q });
      setSearchResults(res.data.users);
    } catch (err) {
      console.error("[AdminPanel] User search failed:", err);
      setSearchError(callableError(err));
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
      setHasSearched(true);
    }
  };

  const selectUser = (u: SearchUserResult) => {
    setSelectedUser(u);
    setBanActionMsg(null);
    const existing = allBans.find((b) => b.uid === u.uid);
    setBanReason(existing?.record.reason ?? "");
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim() || banning) return;
    setBanning(true);
    setBanActionMsg(null);
    try {
      await banUserFn({
        uid: selectedUser.uid,
        durationMs: banDurationMs,
        reason: banReason.trim(),
      });
      setBanActionMsg({
        ok: true,
        text: `${
          selectedUser.displayName ?? selectedUser.email ?? "User"
        } banned${
          banDurationMs === 0
            ? " permanently"
            : ` for ${formatBanDuration(banDurationMs)}`
        }.`,
      });
      setBanReason("");
    } catch (err) {
      console.error("[AdminPanel] Ban failed:", err);
      setBanActionMsg({ ok: false, text: callableError(err) });
    } finally {
      setBanning(false);
    }
  };

  const handleUnbanUser = async (uid: string) => {
    if (unbanning) return;
    setUnbanning(uid);
    try {
      await unbanUserFn({ uid });
    } catch (err) {
      console.error("[AdminPanel] Unban failed:", err);
      setBanActionMsg({ ok: false, text: callableError(err) });
    } finally {
      setUnbanning(null);
    }
  };

  /** Active ban (if any) for the currently selected user. */
  const selectedBan = selectedUser
    ? allBans.find((b) => b.uid === selectedUser.uid) ?? null
    : null;

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

  // The cards are stacked in a flex column so the Invite Code card can
  // jump to the top on mobile — admins toggle registration in one tap
  // without scrolling past the whole Broadcast tool. Desktop keeps the
  // original order (Broadcast first).
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Admin Panel</h2>
        <p className="text-sm text-slate-400">
          Tools available only to the admin account
        </p>
      </div>

      {/* ── Broadcast tool ── */}
      <div className="order-2 mt-5 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up md:order-none md:mt-0">
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

      {/* ── Invite code tool (shown first on mobile so the
              registration-mode toggle is one tap away) ── */}
      <div className="order-first mt-0 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up md:order-none md:mt-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15">
            <KeyRound className="h-4 w-4 text-lime-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Invite Code</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {inviteRequired
                ? "Every new account needs this single code to register (email) or unlock the app (Google). Change it to invalidate the old one."
                : "Registration is open — no invite code is being asked for right now. Keep a code saved so you can flip back to invite-only anytime."}
            </p>
          </div>
        </div>

        {/* Registration mode: invite-only vs. open registration */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Registration mode</p>
            {savingInviteConfig && (
              <span className="flex items-center gap-1.5 text-[10px] text-lime-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSetInviteRequired(true)}
              disabled={!inviteConfigLoaded || savingInviteConfig || inviteRequired}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center transition-all ${
                inviteRequired
                  ? "border-lime-500/50 bg-lime-500/15 text-lime-300"
                  : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-lime-500/30 hover:text-slate-200"
              }`}
            >
              <Lock className="h-4 w-4" />
              <span className="block text-sm font-semibold">Invite-only</span>
              <span className="block text-[10px] text-slate-500">Everyone needs the code</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetInviteRequired(false)}
              disabled={!inviteConfigLoaded || savingInviteConfig || !inviteRequired}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center transition-all ${
                !inviteRequired
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-amber-500/30 hover:text-slate-200"
              }`}
            >
              <Unlock className="h-4 w-4" />
              <span className="block text-sm font-semibold">Open registration</span>
              <span className="block text-[10px] text-slate-500">No invite code needed</span>
            </button>
          </div>
          {!inviteRequired && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5">
              <Unlock className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400">
                Open registration is ON — anyone can create an account without the invite code.
              </p>
            </div>
          )}
        </div>

        {inviteConfigError && (
          <div className="mb-4 rounded-xl border border-red-800/40 bg-red-950/30 p-3">
            <p className="text-xs text-red-400">{inviteConfigError}</p>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-lime-500/25 bg-lime-500/10 px-3.5 py-3">
          <KeyRound className="h-4 w-4 shrink-0 text-lime-400" />
          <span className="font-mono text-base font-bold tracking-wider text-lime-300">
            {currentInviteCode ?? <span className="text-sm font-medium text-lime-200/40">Not set yet</span>}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={inviteCodeDraft}
            onChange={(e) => {
              setInviteCodeDraft(e.target.value);
              setInviteCodeSaved(false);
              setInviteCodeError(null);
            }}
            placeholder="New invite code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-[#0a1628] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-lime-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={generateInviteCode}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-lime-500/30 hover:text-lime-300 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Generate
          </button>
          <button
            type="button"
            onClick={handleSaveInviteCode}
            disabled={savingInviteCode || !inviteCodeDraft.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-lime-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingInviteCode ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inviteCodeSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {savingInviteCode ? "Saving…" : inviteCodeSaved ? "Saved!" : "Set Code"}
          </button>
        </div>

        {inviteCodeError && (
          <div className="mt-3 rounded-xl border border-red-800/40 bg-red-950/30 p-3">
            <p className="text-xs text-red-400">{inviteCodeError}</p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-lime-500/20 bg-lime-500/10 px-3.5 py-2.5">
          {inviteRequired ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-lime-400" />
          ) : (
            <Unlock className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <p className="text-xs text-lime-400">
            {inviteRequired
              ? "Share this code with the people you want to invite. Users who already verified stay unlocked when you change it."
              : "The saved code below isn't being enforced right now. Switching back to Invite-only makes it required again."}
          </p>
        </div>
      </div>

      {/* ── Remote page control ── */}
      <div className="order-4 mt-5 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up md:order-none md:mt-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
            <MonitorSmartphone className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Remote Control</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Open a page on every device signed into this account — iPads follow instantly.
            </p>
          </div>
          {remotePage && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
              </span>
              OPEN: {REMOTE_PAGES.find((p) => p.id === remotePage)?.label ?? remotePage}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REMOTE_PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSendRemotePage(p.id)}
              disabled={sendingRemote !== null}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                remotePage === p.id
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                  : "border-cyan-900/20 bg-[#0a1628] text-slate-300 hover:border-cyan-500/30 hover:text-slate-100"
              }`}
            >
              <MonitorUp className="h-4 w-4" />
              <span className="text-xs font-semibold">{p.label}</span>
              <span className="text-[10px] text-slate-500">
                {sendingRemote === p.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : remoteSent === p.id ? (
                  <Check className="h-3 w-3 text-cyan-400" />
                ) : remotePage === p.id ? (
                  "Open now"
                ) : (
                  "Open on all devices"
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleReleaseRemote}
            disabled={!remotePage}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-600/30 bg-slate-600/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-600/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
            Release devices
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-2.5">
          <MonitorSmartphone className="h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-xs text-cyan-400">
            Every device on this account follows the chosen page in real time — no refresh needed. Tap a page again to re-send it (e.g. for devices that came online late).
          </p>
        </div>
      </div>

      {/* ── Ban users tool ── */}
      <div className="order-3 mt-5 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up md:order-none">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <UserX className="h-4 w-4 text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Ban Users</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Suspend an account for a set time or permanently, with a reason they&apos;ll see.
              Find them by display name / email or by UID — and lift the ban anytime.
            </p>
          </div>
        </div>

        {/* Lookup mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setBanLookupMode("name")}
            className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
              banLookupMode === "name"
                ? "border-red-500/50 bg-red-500/15 text-red-300"
                : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-red-500/30 hover:text-slate-200"
            }`}
          >
            <span className="block text-sm font-semibold">Search by name / email</span>
            <span className="block text-[10px] text-slate-500">Pick from a list of accounts</span>
          </button>
          <button
            type="button"
            onClick={() => setBanLookupMode("uid")}
            className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
              banLookupMode === "uid"
                ? "border-red-500/50 bg-red-500/15 text-red-300"
                : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-red-500/30 hover:text-slate-200"
            }`}
          >
            <span className="block text-sm font-semibold">By account UID</span>
            <span className="block text-[10px] text-slate-500">When you only have the UID</span>
          </button>
        </div>

        {/* Search input + action */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={banQuery}
            onChange={(e) => {
              setBanQuery(e.target.value);
              setSearchError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
            placeholder={
              banLookupMode === "uid"
                ? "Paste a user's UID…"
                : "Display name or email…"
            }
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-[#0a1628] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearchUsers}
            disabled={searchingUsers || !banQuery.trim()}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {searchingUsers ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {banLookupMode === "uid" ? "Look up" : "Search"}
          </button>
        </div>
        {banLookupMode === "uid" && (
          <p className="mt-1.5 text-[10px] text-slate-500">
            Don&apos;t know whose UID it is? Paste it here and we&apos;ll show who it belongs to before you ban.
          </p>
        )}

        {searchError && (
          <div className="mt-3 rounded-xl border border-red-800/40 bg-red-950/30 p-3">
            <p className="text-xs text-red-400">{searchError}</p>
          </div>
        )}
        {hasSearched && !searchingUsers && !searchError && searchResults.length === 0 && (
          <div className="mt-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-3">
            <p className="text-xs text-slate-400">
              No accounts match &ldquo;{banQuery.trim()}&rdquo;.
            </p>
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
            </p>
            {searchResults.map((u) => {
              const banned = allBans.find((b) => b.uid === u.uid);
              const isSelected = selectedUser?.uid === u.uid;
              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => selectUser(u)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-cyan-900/20 bg-[#0a1628] hover:border-cyan-500/30 hover:bg-[#0f2240]"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-[11px] font-bold text-cyan-400">
                    {(u.displayName ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-200">
                      {u.displayName ?? (
                        <span className="text-slate-500">No display name</span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {u.email ?? "No email"}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-cyan-400/70">
                      {u.uid}
                    </span>
                  </span>
                  {banned && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        banned.active
                          ? "border border-red-500/30 bg-red-500/10 text-red-400"
                          : "border border-slate-600/30 bg-slate-600/10 text-slate-400"
                      }`}
                    >
                      {banned.active ? "BANNED" : "EXPIRED"}
                    </span>
                  )}
                  <span className="shrink-0 text-[10px] font-semibold text-red-400">
                    {isSelected ? "Selected" : "Select"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected user — ban composer */}
        {selectedUser && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-[#0a1628] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-xs font-bold text-red-400">
                {(selectedUser.displayName ?? selectedUser.email ?? "?").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {selectedUser.displayName ?? (
                    <span className="text-slate-500">No display name</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {selectedUser.email ?? "No email"}
                </p>
                <p className="truncate font-mono text-[10px] text-cyan-400/70">
                  {selectedUser.uid}
                </p>
              </div>
            </div>

            {selectedBan?.active && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  Currently banned
                </p>
                <p className="mt-1 text-xs text-red-200">{selectedBan.record.reason}</p>
                <p className="mt-0.5 text-[10px] text-red-300/70">
                  {selectedBan.record.expiresAt === 0
                    ? "Permanent ban"
                    : `Lifts ${formatBanExpiry(selectedBan.record.expiresAt)}`}{" "}
                  — banning again updates the ban.
                </p>
              </div>
            )}

            <p className="mb-2 mt-4 text-xs font-medium text-slate-400">How long</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BAN_DURATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setBanDurationMs(d.ms)}
                  className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-all ${
                    banDurationMs === d.ms
                      ? "border-red-500/50 bg-red-500/15 text-red-300"
                      : "border-cyan-900/20 bg-[#0a1628] text-slate-400 hover:border-red-500/30 hover:text-slate-200"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-4 text-xs font-medium text-slate-400">
              Reason (shown to the user)
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="e.g. Repeatedly spamming commands — contact the owner to appeal."
              className="w-full resize-none rounded-xl border border-cyan-500/30 bg-[#0a1628] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400/60 focus:outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-slate-500">
              {banReason.length}/500
            </p>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleBanUser}
                disabled={banning || !banReason.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {banning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                {banning
                  ? "Banning…"
                  : selectedBan?.active
                    ? "Update Ban"
                    : "Ban User"}
              </button>
              {selectedBan?.active && (
                <button
                  type="button"
                  onClick={() => handleUnbanUser(selectedUser.uid)}
                  disabled={unbanning === selectedUser.uid}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {unbanning === selectedUser.uid ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldOff className="h-4 w-4" />
                  )}
                  Unban
                </button>
              )}
            </div>

            {banActionMsg && (
              <div
                className={`mt-3 rounded-xl border p-3 ${
                  banActionMsg.ok
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-red-800/40 bg-red-950/30"
                }`}
              >
                <p
                  className={`text-xs ${
                    banActionMsg.ok ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {banActionMsg.text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* All bans list */}
        {allBans.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              All bans ({allBans.length})
            </p>
            {allBans.map((b) => (
              <div
                key={b.uid}
                className="flex items-start gap-2.5 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {b.record.displayName ?? b.record.email ?? "Unknown user"}
                  </p>
                  <p className="truncate font-mono text-[10px] text-cyan-400/70">
                    {b.uid}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
                    {b.record.reason}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Banned {new Date(b.record.bannedAt).toLocaleDateString()} ·{" "}
                    {b.active ? (
                      <span className="text-red-400">
                        until {formatBanExpiry(b.record.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        expired {formatBanExpiry(b.record.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnbanUser(b.uid)}
                  disabled={unbanning === b.uid}
                  title={b.active ? "Lift this ban" : "Remove this expired record"}
                  aria-label={b.active ? "Unban user" : "Remove expired ban"}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
                    b.active
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-slate-600/30 bg-slate-600/10 text-slate-400 hover:bg-slate-600/20"
                  }`}
                >
                  {unbanning === b.uid ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : b.active ? (
                    <ShieldOff className="h-3 w-3" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  {b.active ? "Unban" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-400">
            Banned users are locked out of the app immediately, and timed bans auto-expire. You can lift any ban here at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
