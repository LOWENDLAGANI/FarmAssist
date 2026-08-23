/**
 * page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Home page — renders the FarmAssist IoT Dashboard.
 * Shows LoginPage if not authenticated, Dashboard if signed in.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useAuth } from "@/components/AuthProvider";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  // Loading state while Firebase checks auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060e1a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Loading FarmAssist…</p>
        </div>
      </div>
    );
  }

  // Not signed in → show login page
  if (!user) {
    return <LoginPage />;
  }

  // Signed in → show dashboard
  return <Dashboard />;
}
