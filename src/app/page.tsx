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
import { Sprout } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#060e1a] px-6">
        <div className="relative flex w-full max-w-xs flex-col items-center rounded-3xl border border-cyan-400/15 bg-[#0a1628]/90 px-10 py-11 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-cyan-400/5 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-400/15 border-t-cyan-300" />
            <div className="absolute inset-2 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-2 border-emerald-400/15 border-b-emerald-400" />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 shadow-lg shadow-cyan-400/10">
              <Sprout className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <h1 className="mt-7 text-xl font-bold tracking-tight text-white">FarmAssist</h1>
          <p className="mt-2 text-sm text-slate-400">Preparing your farm dashboard</p>
          <div className="mt-6 h-1 w-28 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
          </div>
        </div>
      </main>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}
