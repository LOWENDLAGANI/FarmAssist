/**
 * SettingsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Settings page for app configuration and device info.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Sun, Moon, Database, Wifi, Cpu, RefreshCw } from "lucide-react";
import { useAppTheme } from "../ThemeProvider";
import type { ConnectionStatus } from "@/types/telemetry";

interface SettingsPageProps {
  status: ConnectionStatus;
  lastUpdated: number | null;
}

export default function SettingsPage({ status, lastUpdated }: SettingsPageProps) {
  const { theme, toggleTheme } = useAppTheme();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400">Configure your FarmAssist dashboard</p>
      </div>

      <div className="space-y-4">
        {/* Theme */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Appearance</h3>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-4 transition-colors hover:bg-[#0f2240]"
          >
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-cyan-400" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-400" />
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-200">Theme</p>
              <p className="text-xs text-slate-500">
                Currently: {theme === "dark" ? "Dark" : "Light"}
              </p>
            </div>
            <RefreshCw className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Connection Info */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Connection</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-[#0a1628] p-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Status</span>
              </div>
              <span
                className={`text-xs font-medium ${
                  status === "live"
                    ? "text-emerald-400"
                    : status === "stale"
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {status === "live" ? "Connected" : status === "stale" ? "Stale" : "Offline"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#0a1628] p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Database</span>
              </div>
              <span className="text-xs text-slate-400">Realtime DB</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#0a1628] p-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Device</span>
              </div>
              <span className="text-xs text-slate-400">ESP32-S3</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">About</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p>FarmAssist IoT Dashboard Powered by Minetallest v0.1.0</p>
            <p>monitoring System</p>
            <p className="text-slate-500">Built with Next.js, Firebase, and Tailwind CSS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
