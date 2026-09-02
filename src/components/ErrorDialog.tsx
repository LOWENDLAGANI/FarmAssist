/**
 * ErrorDialog.tsx
 * ─────────────────────────────────────────────────────────────────
 * Modal dialog for critical errors.
 * Shows user-friendly messages only — no developer config details.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { AlertTriangle, X, Wifi, RefreshCw } from "lucide-react";

interface ErrorDialogProps {
  error: string;
  onClose: () => void;
}

/** Detect error type and provide user-friendly guidance. */
function getErrorInfo(error: string): {
  title: string;
  message: string;
  actions: string[];
} {
  if (error.includes("permission_denied")) {
    return {
      title: "Access Denied",
      message: "You don't have permission to access this device's data. This usually means the device hasn't been paired correctly.",
      actions: [
        "Make sure you entered the correct Device ID in Settings",
        "Check that the ESP32 is using your User ID (shown in Settings)",
        "Contact the device owner to grant you access",
      ],
    };
  }

  if (error.includes("auth/operation-not-allowed")) {
    return {
      title: "Sign-In Not Available",
      message: "The sign-in method you're trying to use isn't enabled yet.",
      actions: [
        "Try signing in again",
        "If the problem persists, contact support",
      ],
    };
  }

  if (error.includes("auth/api-key-not-valid")) {
    return {
      title: "Connection Failed",
      message: "Unable to connect to the server. This is a configuration issue.",
      actions: [
        "Refresh the page and try again",
        "Contact support if the problem persists",
      ],
    };
  }

  return {
    title: "Connection Error",
    message: "Something went wrong while connecting to the server.",
    actions: [
      "Check your internet connection",
      "Refresh the page",
      "Try again later",
    ],
  };
}

export default function ErrorDialog({ error, onClose }: ErrorDialogProps) {
  const errorInfo = getErrorInfo(error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-red-500/30 bg-[#0c1a2e] p-0 shadow-2xl shadow-red-950/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-900/30 bg-red-950/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white">
              {errorInfo.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Message */}
          <p className="text-sm text-slate-300 leading-relaxed">
            {errorInfo.message}
          </p>

          {/* Actions */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">
              What you can try:
            </p>
            <ol className="space-y-2">
              {errorInfo.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                    {i + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-cyan-900/20 px-6 py-4">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
