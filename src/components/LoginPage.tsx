/**
 * LoginPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Sign-in page with Google authentication, Email/Password login,
 * account registration, and forgot password flow.
 *
 * 🎨 Poster-style design (green gradient, mascot, wordmark + tagline).
 *
 * 🖼️ MASCOT SETUP:
 * Drop your mascot picture at:   public/farmassist-mascot.png
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import {
  Sprout,
  Loader2,
  Mail,
  Lock,
  Leaf,
  Sparkles,
  KeyRound,
  ArrowLeft,
  CheckCircle,
  UserPlus,
  User,
} from "lucide-react";
import GoogleIcon from "./GoogleIcon";

/** Decorative floating leaves scattered around the screen */
const DECOR_LEAVES = [
  { className: "left-[8%] top-[12%] h-10 w-10 rotate-[-25deg]", delay: "0s" },
  { className: "right-[10%] top-[20%] h-8 w-8 rotate-[20deg]", delay: "0.8s" },
  { className: "left-[14%] bottom-[16%] h-12 w-12 rotate-[15deg]", delay: "1.6s" },
  { className: "right-[8%] bottom-[24%] h-9 w-9 rotate-[-15deg]", delay: "0.4s" },
  { className: "left-[45%] top-[6%] h-6 w-6 rotate-[30deg]", delay: "1.2s" },
  { className: "right-[30%] bottom-[8%] h-7 w-7 rotate-[-30deg]", delay: "2s" },
];

type ViewMode = "signin" | "register" | "forgot";

/** Friendly error messages for Firebase auth / callable error codes */
function friendlyError(err: unknown): string {
  const code =
    err instanceof Error ? (err as { code?: string }).code : undefined;

  // Errors thrown by the Cloud Functions carry the server's message.
  if (code?.startsWith("functions/")) {
    const message = err instanceof Error ? err.message : "";
    // httpsCallable can prefix the message with the error code
    // (e.g. "invalid-argument, ..." or "internal(0), ...").
    const stripped = message.match(/^[a-z-]+(?:\(\d*\))?\s*,\s*(.*)$/);
    return (
      (stripped ? stripped[1] : message) ||
      "Something went wrong. Please try again in a moment."
    );
  }

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please check your credentials and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in with your existing method (email/password or Google), then link additional sign-in methods in Account Settings.";
    case "auth/weak-password":
      return "Your password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address. Please double-check it.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error — please check your internet connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support for help.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed. Please try again when you're ready.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked by your browser. Please allow popups for this site.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists using a different sign-in method. Please sign in with your email/password first, then link your Google account in Account Settings.";
    default:
      return "Something went wrong. Please try again in a moment.";
  }
}

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    inviteRequired,
  } = useAuth();

  const [view, setView] = useState<ViewMode>("signin");
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  // ── Sign-in fields ──
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // ── Register fields ──
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regInviteCode, setRegInviteCode] = useState("");

  // ── Forgot password fields ──
  const [resetEmail, setResetEmail] = useState("");

  // ── UI state ──
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const clearErrors = () => setError(null);

  // ── Switch views ──
  const goToSignIn = () => { setView("signin"); clearErrors(); setShowEmailLogin(false); };
  const goToRegister = () => { setView("register"); clearErrors(); setResetSent(false); setShowEmailLogin(false); };
  const goToForgot = () => { setView("forgot"); setResetEmail(signInEmail.trim()); clearErrors(); setResetSent(false); setShowEmailLogin(false); };

  // ── Google Sign-In ──
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("[LoginPage] Google sign-in failed:", err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Email/Password Sign-In ──
  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!signInEmail.trim() || !signInPassword.trim()) {
      setError("Please enter both your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(signInEmail.trim(), signInPassword);
    } catch (err) {
      console.error("[LoginPage] Email sign-in failed:", err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim()) {
      setError("Please enter your name so we know what to call you.");
      return;
    }
    if (!regEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Your password needs at least 6 characters to keep your account secure.");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("The passwords you entered don't match. Please try again.");
      return;
    }
    // The invite code is only required while the admin has invite-only
    // registration turned on.
    if (inviteRequired && !regInviteCode.trim()) {
      setError("Please enter the invite code to register — FarmAssist is invite-only.");
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(
        regEmail.trim(),
        regPassword,
        regName.trim(),
        inviteRequired ? regInviteCode.trim() : ""
      );
    } catch (err) {
      console.error("[LoginPage] Registration failed:", err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ──
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!resetEmail.trim()) {
      setError("Please enter the email address linked to your account.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      console.error("[LoginPage] Password reset failed:", err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center overflow-x-hidden overflow-y-auto bg-[#1d3a14] px-4 py-10">
      {/* Spacer for vertical centering on tall screens, collapses on short ones */}
      <div className="flex-1" aria-hidden="true" />
      {/* ── Poster background: radial green glow ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 65% at 50% 32%, #4a7c2e 0%, #356021 45%, #1d3a14 100%)",
        }}
        aria-hidden="true"
      />

      {/* ── Floating leaf decorations ── */}
      {DECOR_LEAVES.map((leaf, i) => (
        <Leaf
          key={i}
          className={`absolute text-lime-300/15 animate-float ${leaf.className}`}
          style={{ animationDelay: leaf.delay }}
          aria-hidden="true"
        />
      ))}
      <Sparkles className="absolute left-[30%] top-[14%] h-4 w-4 text-lime-200/40 animate-pulse" aria-hidden="true" />
      <Sparkles className="absolute right-[26%] top-[38%] h-3 w-3 text-lime-200/30 animate-pulse" style={{ animationDelay: "1s" }} aria-hidden="true" />

      {/* ── Content ── */}
      <div className="relative w-full max-w-sm">
        {/* Mascot */}
        <div className="mb-4 flex justify-center">
          <img
            src="/farmassist-mascot.png"
            alt="FarmAssist mascot"
            className="h-44 w-44 animate-float object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback) return;
              img.dataset.fallback = "1";
              img.style.display = "none";
              img.nextElementSibling?.removeAttribute("style");
            }}
          />
          <div
            className="flex h-28 w-28 items-center justify-center rounded-3xl bg-lime-500/15 shadow-xl shadow-black/30"
            style={{ display: "none" }}
          >
            <Sprout className="h-14 w-14 text-lime-300" />
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <span className="text-white">Farm</span>
            <span className="text-lime-400">Assist</span>
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-lime-200/90">
            <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            Simplified IoT Dashboard just for you
            <Leaf className="h-3.5 w-3.5 -scale-x-100" aria-hidden="true" />
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-lime-500/25 bg-[#16290f]/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-md animate-scale-in">

          {/* Error — shown at top so it's always visible */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-800/40 bg-red-950/30 p-3">
              <p className="text-center text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SIGN IN VIEW
             ═══════════════════════════════════════════════════ */}
          {view === "signin" && (
            <>
              {/* Google Sign-In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <GoogleIcon className="h-5 w-5" />
                )}
                {loading ? "Signing in..." : "Sign in with Google"}
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-lime-500/20" />
                <span className="text-xs text-lime-200/60">or</span>
                <div className="h-px flex-1 bg-lime-500/20" />
              </div>

              {/* Email/Password toggle + collapsible form */}
              <button
                type="button"
                onClick={() => setShowEmailLogin((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-lime-500/25 bg-lime-500/10 px-4 py-3 text-sm font-medium text-lime-300 transition-all hover:bg-lime-500/20 hover:shadow-lg hover:shadow-lime-500/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mail className="h-4 w-4" />
                {showEmailLogin ? "Hide email sign-in" : "Sign in with email"}
                <span className={`ml-1 text-[10px] transition-transform duration-300 ${showEmailLogin ? "rotate-180" : ""}`}>▾</span>
              </button>

              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: showEmailLogin ? "1fr" : "0fr", opacity: showEmailLogin ? 1 : 0 }}
              >
                <div className="overflow-hidden">
                  <form onSubmit={handleEmailSignIn} className="space-y-3 pt-3">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                      <input
                        type="password"
                        placeholder="Password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={goToForgot}
                        className="text-xs font-medium text-lime-400/80 hover:text-lime-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-lime-900/30 transition-all hover:bg-lime-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      {loading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Link to Register */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={goToRegister}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-lime-500/40 bg-lime-500/15 px-4 py-3 text-sm font-semibold text-lime-300 transition-all hover:bg-lime-500/25 hover:shadow-lg hover:shadow-lime-500/10 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  Register account
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              REGISTER VIEW
             ═══════════════════════════════════════════════════ */}
          {view === "register" && (
            <>
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15">
                  <UserPlus className="h-6 w-6 text-lime-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Create Account</h2>
                <p className="mt-1 text-xs text-lime-200/60">
                  {inviteRequired
                    ? "Invite-only: you need the invite code to register."
                    : "Registration is open — no invite code needed."}
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    autoComplete="name"
                    autoFocus
                    className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                  <input
                    type="password"
                    placeholder="Password (at least 6 characters)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>

                {inviteRequired && (
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                    <input
                      type="text"
                      placeholder="Invite code (required)"
                      value={regInviteCode}
                      onChange={(e) => setRegInviteCode(e.target.value)}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-lime-900/30 transition-all hover:bg-lime-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-lime-500/20" />
                <span className="text-xs text-lime-200/60">or</span>
                <div className="h-px flex-1 bg-lime-500/20" />
              </div>

              {/* Google Sign-Up */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-lime-500/40 bg-lime-500/15 px-4 py-3 text-sm font-medium text-lime-300 transition-all hover:bg-lime-500/25 hover:shadow-lg hover:shadow-lime-500/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon className="h-5 w-5" />
                Sign up with Google
              </button>
              <p className="mt-2 text-center text-[10px] text-lime-200/50">
                {inviteRequired
                  ? "New Google accounts must enter the invite code to unlock the app."
                  : "New Google accounts open instantly — no invite code needed."}
              </p>

              {/* Link to Sign In */}
              <p className="mt-5 text-center text-xs text-lime-200/50">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={goToSignIn}
                  className="font-semibold text-lime-400 hover:text-lime-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              FORGOT PASSWORD VIEW
             ═══════════════════════════════════════════════════ */}
          {view === "forgot" && (
            <>
              {!resetSent ? (
                <>
                  <div className="mb-5 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15">
                      <Lock className="h-6 w-6 text-lime-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Reset Password</h2>
                    <p className="mt-1 text-xs text-lime-200/60">
                      Enter your email and we&apos;ll send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                        className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-lime-900/30 transition-all hover:bg-lime-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Check Your Email</h2>
                  <p className="mt-2 text-sm text-lime-200/70">
                    We sent a password reset link to{" "}
                    <span className="font-medium text-lime-300">{resetEmail}</span>.
                    Check your inbox and follow the instructions.
                  </p>
                  <p className="mt-3 text-xs text-lime-200/40">
                    Didn&apos;t receive it? Check your spam folder, or try again in a few minutes.
                  </p>
                </div>
              )}

              <button
                onClick={goToSignIn}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-lime-500/25 bg-lime-500/10 px-4 py-3 text-sm font-medium text-lime-300 transition-all hover:bg-lime-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </button>
            </>
          )}

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-lime-200/40">
          Powered by Minetallest
        </p>
      </div>

      {/* Spacer for vertical centering on tall screens, collapses on short ones */}
      <div className="flex-1" aria-hidden="true" />
    </div>
  );
}
