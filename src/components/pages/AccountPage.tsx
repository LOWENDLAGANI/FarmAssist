/**
 * AccountPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Dedicated account / user info page.
 * Shows profile photo, display name, email, account UID (copyable),
 * sign-in method, member-since date, and a sign-out button.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { ref, remove } from "firebase/database";
import { deleteUser, updateProfile, linkWithPopup, unlink, GoogleAuthProvider, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { useAuth } from "../AuthProvider";
import { useAppTheme } from "../ThemeProvider";
import { useDeviceValidation } from "@/hooks/useDeviceValidation";
import { db, auth } from "@/lib/firebaseConfig";
import GoogleIcon from "../GoogleIcon";
import {
  User,
  Mail,
  Fingerprint,
  Copy,
  Check,
  LogOut,
  ShieldCheck,
  CalendarDays,
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  LifeBuoy,
  Pencil,
  Link as LinkIcon,
  Lock,
} from "lucide-react";


/* ── Support channels ─────────────────────────────────────────── */
/* ✏️ EDIT THESE with your real support links before production!  */
const SUPPORT_LINKS = {
  email: "mailto:myrealmetvreal@gmail.com?subject=FarmAssist%20Support",
  discord: "https://discord.com/users/965538016875667486",
  telegram: "https://t.me/Minetallest",
  line: "https://line.me/ti/p/xQGXmFTQq7",
};

/** Brand logos as inline SVGs (no icon library needed) */
function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function LineLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.797 24 12.685 24 10.314" />
    </svg>
  );
}

/** The four support channels shown on the page */
const SUPPORT_CHANNELS = [
  {
    id: "email",
    label: "Email",
    description: "Email us for support",
    href: SUPPORT_LINKS.email,
    logo: <Mail className="h-5 w-5" />,
    color: "text-red-400",
    bgColor: "bg-red-500/15",
  },
  {
    id: "discord",
    label: "Discord",
    description: "Feel free to message us Discord server",
    href: SUPPORT_LINKS.discord,
    logo: <DiscordLogo className="h-5 w-5" />,
    color: "text-[#8b93ff]",
    bgColor: "bg-[#5865F2]/15",
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Message us on Telegram",
    href: SUPPORT_LINKS.telegram,
    logo: <TelegramLogo className="h-5 w-5" />,
    color: "text-sky-400",
    bgColor: "bg-[#229ED9]/15",
  },
  {
    id: "line",
    label: "LINE",
    description: "Get help on LINE (Fastest)",
    href: SUPPORT_LINKS.line,
    logo: <LineLogo className="h-5 w-5" />,
    color: "text-[#06C755]",
    bgColor: "bg-[#06C755]/15",
  },
];

export default function AccountPage() {
  const { user, logOut } = useAuth();
  const { deviceId } = useAppTheme();
  const { unlinkDevice } = useDeviceValidation(user?.uid ?? "", deviceId);
  const [uidCopied, setUidCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [unlinkSuccess, setUnlinkSuccess] = useState(false);
  const [unlinkConfirmProvider, setUnlinkConfirmProvider] = useState<string | null>(null);
  const [showLinkEmailModal, setShowLinkEmailModal] = useState(false);
  const [linkEmailInput, setLinkEmailInput] = useState("");
  const [linkPasswordInput, setLinkPasswordInput] = useState("");
  const [linkingEmail, setLinkingEmail] = useState(false);

  const displayName = user?.displayName ?? "FarmAssist User";
  const email = user?.email ?? "No email linked";
  const photoURL = user?.photoURL ?? null;
  const userUID = user?.uid ?? "";
  // Determine all linked sign-in methods
  const linkedProviders = (user?.providerData ?? []).map((p) => p.providerId);
  const hasGoogle = linkedProviders.includes("google.com");
  const hasEmail = linkedProviders.includes("password");
  const signInMethod = hasGoogle && hasEmail
    ? "Google + Email"
    : hasGoogle
      ? "Google account"
      : hasEmail
        ? "Email / password"
        : "Unknown";
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // ── Display name editing (saved to the Firebase Auth profile) ─
  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!user || trimmed.length === 0 || trimmed === user.displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      await user.reload();
      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      console.error("[AccountPage] Failed to update display name:", err);
    } finally {
      setSavingName(false);
    }
  };

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(userUID);
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logOut();
    } finally {
      setLoggingOut(false);
    }
  };

  // ── Link Google account ──────────────────────────────────────
  const handleLinkGoogle = async () => {
    if (!user) return;
    setLinkingGoogle(true);
    setLinkError(null);
    setLinkSuccess(false);
    try {
      await linkWithPopup(user, new GoogleAuthProvider());
      setLinkSuccess(true);
      await user.reload();
      setTimeout(() => setLinkSuccess(false), 3000);
    } catch (err) {
      console.error("[AccountPage] Google link failed:", err);
      const code = err instanceof Error ? (err as { code?: string }).code : undefined;
      if (code === "auth/provider-already-linked") {
        setLinkError("Your account is already linked with Google.");
      } else if (code === "auth/credential-already-in-use") {
        setLinkError("This Google account is already linked to a different user. Please sign in with that account instead.");
      } else if (code === "auth/popup-closed-by-user") {
        setLinkError("Linking cancelled. Please try again when you're ready.");
      } else if (code === "auth/popup-blocked") {
        setLinkError("The popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setLinkError("Failed to link Google account. Please try again.");
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  // ── Unlink any linked provider ────────────────────────────────
  const handleUnlinkProvider = async (providerId: string) => {
    if (!user) return;
    setUnlinkingProvider(providerId);
    setLinkError(null);
    setUnlinkSuccess(false);
    try {
      if (user.providerData.length <= 1) {
        setLinkError("Cannot unlink your only sign-in method. Please link another method first.");
        return;
      }
      await unlink(user, providerId);
      setUnlinkSuccess(true);
      await user.reload();
      setTimeout(() => setUnlinkSuccess(false), 3000);
    } catch (err) {
      console.error("[AccountPage] Unlink failed:", err);
      const code = err instanceof Error ? (err as { code?: string }).code : undefined;
      const label = providerId === "google.com" ? "Google" : "email";
      if (code === "auth/no-visible-user") {
        setLinkError("No user is currently signed in. Please sign in and try again.");
      } else if (code === "auth/requires-recent-login") {
        setLinkError(`For security, please sign out and sign back in before unlinking ${label}.`);
      } else {
        setLinkError(`Failed to unlink ${label}. Please try again.`);
      }
    } finally {
      setUnlinkingProvider(null);
    }
  };

  // ── Link Email/Password account ──────────────────────────────
  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLinkingEmail(true);
    setLinkError(null);
    try {
      const credential = EmailAuthProvider.credential(linkEmailInput.trim(), linkPasswordInput);
      await linkWithCredential(user, credential);
      setShowLinkEmailModal(false);
      setLinkEmailInput("");
      setLinkPasswordInput("");
      setLinkSuccess(true);
      await user.reload();
      setTimeout(() => setLinkSuccess(false), 3000);
    } catch (err) {
      console.error("[AccountPage] Email link failed:", err);
      const code = err instanceof Error ? (err as { code?: string }).code : undefined;
      if (code === "auth/provider-already-linked") {
        setLinkError("Your account is already linked with Email & Password.");
      } else if (code === "auth/credential-already-in-use") {
        setLinkError("An account with this email already exists. Please use a different email.");
      } else if (code === "auth/weak-password") {
        setLinkError("Password must be at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setLinkError("Please enter a valid email address.");
      } else {
        setLinkError("Failed to link email. Please try again.");
      }
    } finally {
      setLinkingEmail(false);
    }
  };

  // ── Account deletion ────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // 1. Release the paired Rover so others can claim it
      await unlinkDevice(user.uid, deviceId);

      // 2. Wipe all user data (telemetry, history, sessions, ranges, settings, notifications…)
      await remove(ref(db, `users/${user.uid}`));

      // 3. Delete the Firebase Auth account (requires recent sign-in)
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      // onAuthStateChanged fires after deletion → app returns to the login screen
    } catch (err) {
      console.error("[AccountPage] Account deletion failed:", err);
      const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "";
      if (code === "auth/requires-recent-login") {
        setDeleteError(
          "For security you must sign in again before deleting your account. Please sign out, sign back in, and try once more."
        );
      } else {
        setDeleteError("Account deletion failed. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Account</h2>
        <p className="text-sm text-slate-400">
          Your profile and sign-in information
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-6 animate-slide-up">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile photo"
              className="h-20 w-20 shrink-0 rounded-2xl border-2 border-cyan-500/30 object-cover shadow-lg shadow-cyan-950/50"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/10 shadow-lg shadow-cyan-950/50">
              <User className="h-10 w-10 text-cyan-400" />
            </div>
          )}

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
              {editingName ? (
                <div className="flex w-full items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    maxLength={50}
                    autoFocus
                    className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-[#0a1628] px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                    placeholder="Your display name"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={savingName || nameInput.trim().length === 0}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-cyan-500 active:scale-95 disabled:opacity-50"
                  >
                    {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="rounded-xl border border-cyan-900/20 bg-[#0a1628] p-2 text-slate-400 transition-all hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="truncate text-lg font-bold text-white">{displayName}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(user?.displayName ?? "");
                      setEditingName(true);
                    }}
                    title="Edit display name"
                    className="rounded-xl p-1.5 text-slate-500 transition-all hover:bg-cyan-500/10 hover:text-cyan-400"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {nameSaved && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>

            {/* Info rows */}
            <dl className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Email</dt>
                  <dd className="truncate text-sm text-slate-200">{email}</dd>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                <Fingerprint className="h-4 w-4 shrink-0 text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Account UID</dt>
                  <dd className="truncate font-mono text-xs text-cyan-300">{userUID}</dd>
                </div>
                <button
                  type="button"
                  onClick={copyUid}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {uidCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-500">Sign-in method</dt>
                    <dd className="truncate text-sm text-slate-200">{signInMethod}</dd>
                  </div>
                </div>
                {/* Show all linked providers */}
                {linkedProviders.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                    {hasGoogle && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        <GoogleIcon className="h-3 w-3" />
                        Google
                      </span>
                    )}
                    {hasEmail && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-lime-500/20 bg-lime-500/10 px-2 py-0.5 text-[10px] font-medium text-lime-400">
                        <Mail className="h-3 w-3" />
                        Email &amp; Password
                      </span>
                    )}
                  </div>
                )}
              </div>

              {memberSince && (
                <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-cyan-400" />
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-500">Member since</dt>
                    <dd className="truncate text-sm text-slate-200">{memberSince}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-950/50 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>

      {/* ── Bind / link another sign-in method ── */}
      <div className="mt-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
            <LinkIcon className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Bind / Link Account</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Connect or disconnect sign-in methods for this account.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Google provider */}
          {!hasGoogle && (
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={linkingGoogle}
              aria-label="Bind or link a Google account"
              className="flex w-full items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-3 transition-all hover:border-blue-500/40 hover:bg-[#0f2240] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linkingGoogle ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-400" />
              ) : (
                <GoogleIcon className="h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0 text-left">
                <span className="text-sm font-medium text-slate-200">Bind / Link Google Account</span>
                <span className="block text-[11px] text-slate-500">Sign in with your Google account as a backup</span>
              </div>
            </button>
          )}
          {hasGoogle && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium text-emerald-400">Google linked</span>
              </div>
              {user?.providerData && user.providerData.length > 1 && (
                <button
                  type="button"
                  onClick={() => setUnlinkConfirmProvider("google.com")}
                  disabled={!!unlinkingProvider}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {unlinkingProvider === "google.com" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Unlink
                </button>
              )}
            </div>
          )}

          {/* Email provider */}
          {hasEmail && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Email &amp; Password linked</span>
              </div>
              {user?.providerData && user.providerData.length > 1 && (
                <button
                  type="button"
                  onClick={() => setUnlinkConfirmProvider("password")}
                  disabled={!!unlinkingProvider}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {unlinkingProvider === "password" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Unlink
                </button>
              )}
            </div>
          )}
          {!hasEmail && (
            <button
              type="button"
              onClick={() => { setLinkError(null); setShowLinkEmailModal(true); }}
              disabled={linkingEmail}
              className="flex w-full items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-3 transition-all hover:border-lime-500/40 hover:bg-[#0f2240] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="h-5 w-5 shrink-0 text-lime-400" />
              <div className="min-w-0 text-left">
                <span className="text-sm font-medium text-slate-200">Bind / Link Email &amp; Password</span>
                <span className="block text-[11px] text-slate-500">Add email/password as a backup sign-in method</span>
              </div>
            </button>
          )}

          {hasEmail && !hasGoogle && (
            <p className="text-xs text-slate-500 px-1">
              Email &amp; Password is your primary sign-in method.
            </p>
          )}
          {hasGoogle && !hasEmail && (
            <p className="text-xs text-slate-500 px-1">
              Google is your primary sign-in method.
            </p>
          )}
        </div>

        {/* Link success message */}
        {(linkSuccess || unlinkSuccess) && (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-center text-sm text-emerald-400">
              {unlinkSuccess ? "Account unlinked successfully!" : "Account linked successfully!"}
            </p>
          </div>
        )}

        {/* Link error message */}
        {linkError && (
          <div className="mt-3 rounded-xl border border-red-800/40 bg-red-950/30 p-3">
            <p className="text-center text-sm text-red-400">{linkError}</p>
          </div>
        )}
      </div>

      {/* ── Link Email Modal ── */}
      {showLinkEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => !linkingEmail && setShowLinkEmailModal(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-[#0c1a2e] shadow-2xl shadow-cyan-950/50 animate-scale-in">
            <div className="flex items-center justify-between border-b border-cyan-900/30 bg-[#0a1628] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500/15">
                  <Mail className="h-5 w-5 text-lime-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Link Email &amp; Password</h3>
              </div>
              <button
                onClick={() => !linkingEmail && setShowLinkEmailModal(false)}
                disabled={linkingEmail}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleLinkEmail} className="space-y-3 px-6 py-5">
              <p className="text-sm text-slate-300">
                Enter the email and password you&apos;d like to link as a backup sign-in method.
              </p>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/50" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={linkEmailInput}
                  onChange={(e) => setLinkEmailInput(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-xl border border-cyan-500/30 bg-[#0a1628] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/50" />
                <input
                  type="password"
                  placeholder="Password (at least 6 characters)"
                  value={linkPasswordInput}
                  onChange={(e) => setLinkPasswordInput(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-cyan-500/30 bg-[#0a1628] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
              {linkError && (
                <div className="rounded-xl border border-red-800/40 bg-red-950/30 p-3">
                  <p className="text-xs text-red-400">{linkError}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkEmailModal(false)}
                  disabled={linkingEmail}
                  className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingEmail || !linkEmailInput.trim() || linkPasswordInput.length < 6}
                  className="flex items-center gap-2 rounded-xl bg-lime-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-lime-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {linkingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  {linkingEmail ? "Linking..." : "Link Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Contact Support ── */}
      <div className="mt-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
            <LifeBuoy className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Contact Support</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Reach us on whichever platform you prefer — we will redirect you right to it.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUPPORT_CHANNELS.map((channel) => (
            <a
              key={channel.id}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-3 transition-all hover:border-cyan-500/40 hover:bg-[#0f2240] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${channel.bgColor} ${channel.color}`}
              >
                {channel.logo}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${channel.color}`}>{channel.label}</span>
                <span className="block truncate text-[11px] text-slate-500">{channel.description}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/10 p-5 animate-slide-up">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Permanently delete your account and all data linked to it. This cannot be
              undone.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText("");
            setDeleteError(null);
            setShowDeleteConfirm(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 hover:scale-[1.01] active:scale-[0.98]"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>

      {/* ── Delete account confirmation dialog ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-red-500/30 bg-[#0c1a2e] shadow-2xl shadow-red-950/50 animate-scale-in">
            <div className="flex items-center justify-between border-b border-red-900/30 bg-red-950/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Delete Account?</h3>
              </div>
              <button
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                disabled={deleting}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-300">
                This will <strong className="text-red-400">permanently delete</strong> your
                account along with all telemetry, sensor history, sessions, ranges,
                settings, and notifications.
              </p>
              <p className="text-sm leading-relaxed text-slate-300">
                Your paired Rover will be released so it can be claimed by another
                account. This action <strong className="text-red-400">cannot be undone</strong>.
              </p>

              <div>
                <label htmlFor="delete-confirm" className="mb-1.5 block text-xs text-slate-400">
                  Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={deleting}
                  placeholder="DELETE"
                  autoComplete="off"
                  className="w-full rounded-xl border border-red-500/30 bg-[#0a1628] px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-red-500/60 focus:outline-none disabled:opacity-50"
                />
              </div>

              {deleteError && (
                <div className="rounded-xl border border-red-800/40 bg-red-950/30 p-3">
                  <p className="text-xs leading-relaxed text-red-400">{deleteError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-red-900/20 px-6 py-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unlink provider confirmation dialog ── */}
      {unlinkConfirmProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => !unlinkingProvider && setUnlinkConfirmProvider(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#0c1a2e] shadow-2xl shadow-red-950/50 animate-scale-in">
            <div className="flex items-center justify-between border-b border-red-900/30 bg-red-950/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Unlink {unlinkConfirmProvider === "google.com" ? "Google" : "Email & Password"}?
                </h3>
              </div>
              <button
                onClick={() => setUnlinkConfirmProvider(null)}
                disabled={!!unlinkingProvider}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-300">
                You will no longer be able to sign in using {unlinkConfirmProvider === "google.com" ? "your Google account" : "email and password"}.
                {" "}You can re-link it later from Account Settings.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-red-900/20 px-6 py-4">
              <button
                onClick={() => setUnlinkConfirmProvider(null)}
                disabled={!!unlinkingProvider}
                className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUnlinkProvider(unlinkConfirmProvider);
                  setUnlinkConfirmProvider(null);
                }}
                disabled={!!unlinkingProvider}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {unlinkingProvider ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Unlinking...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Unlink
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
