/**
 * SettingsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Settings page for app configuration, device pairing,
 * sensor range configuration, and info.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import {
  Sun,
  Moon,
  Database,
  Wifi,
  Cpu,
  RefreshCw,
  Link,
  Check,
  Sliders,
  RotateCcw,
  Copy,
  User,
} from "lucide-react";
import { useAppTheme } from "../ThemeProvider";
import type { ConnectionStatus, SensorKey } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";
import type { SensorRanges } from "@/hooks/useSensorRanges";

interface SettingsPageProps {
  status: ConnectionStatus;
  lastUpdated?: number | null;
  deviceId: string;
  onDeviceChange: (id: string) => void;
  sensorRanges: SensorRanges;
  onRangesSave: (ranges: SensorRanges) => void;
  onRangesReset: () => void;
  userUID: string;
}

const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

export default function SettingsPage({
  status,
  deviceId,
  onDeviceChange,
  sensorRanges,
  onRangesSave,
  onRangesReset,
  userUID,
}: SettingsPageProps) {
  const { theme, toggleTheme } = useAppTheme();
  const [deviceInput, setDeviceInput] = useState(deviceId);
  const [saved, setSaved] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  // ── Local editing state for ranges ──────────────────────────
  const [editingRanges, setEditingRanges] = useState<SensorRanges>(sensorRanges);
  const [rangesSaved, setRangesSaved] = useState(false);

  const handleSaveDevice = () => {
    if (deviceInput.trim().length === 0) return;
    onDeviceChange(deviceInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRangeChange = (sensor: SensorKey, field: "optimalMin" | "optimalMax", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    setEditingRanges((prev) => ({
      ...prev,
      [sensor]: { ...prev[sensor], [field]: num },
    }));
  };

  const handleSaveRanges = () => {
    // Single batch write to RTDB
    onRangesSave(editingRanges);
    setRangesSaved(true);
    setTimeout(() => setRangesSaved(false), 2000);
  };

  const handleResetRanges = () => {
    onRangesReset();
    // Reset local editing state to defaults
    setEditingRanges({
      temperature: { optimalMin: SENSOR_META.temperature.optimalRange[0], optimalMax: SENSOR_META.temperature.optimalRange[1] },
      moisture: { optimalMin: SENSOR_META.moisture.optimalRange[0], optimalMax: SENSOR_META.moisture.optimalRange[1] },
      waterLevel: { optimalMin: SENSOR_META.waterLevel.optimalRange[0], optimalMax: SENSOR_META.waterLevel.optimalRange[1] },
      light: { optimalMin: SENSOR_META.light.optimalRange[0], optimalMax: SENSOR_META.light.optimalRange[1] },
    });
    setRangesSaved(true);
    setTimeout(() => setRangesSaved(false), 2000);
  };

  const handleCopyUID = async () => {
    try {
      await navigator.clipboard.writeText(userUID);
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400">
          Configure your FarmAssist dashboard
        </p>
      </div>

      <div className="space-y-4">
        {/* User UID (for ESP32 pairing) */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Your User ID
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            This is your unique Firebase Auth UID. The ESP32 uses this to write
            data to your personal database path. Copy this and paste it into your
            ESP32 Arduino sketch as <code className="rounded bg-[#0a1628] px-1 text-cyan-400">USER_UID</code>.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={userUID}
                readOnly
                className="w-full rounded-xl border border-cyan-900/20 bg-[#0a1628] py-3 pl-9 pr-4 text-sm text-cyan-400 font-mono outline-none"
              />
            </div>
            <button
              onClick={handleCopyUID}
              className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
            >
              {uidCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
            <p className="text-xs text-amber-400">
              ⚠️ Update your ESP32 sketch with this UID before flashing.
              Change the <code className="font-mono">USER_UID</code> define to:
            </p>
            <code className="mt-1 block rounded bg-[#0a1628] px-2 py-1 text-xs text-cyan-400 font-mono">
              #define USER_UID &quot;{userUID}&quot;
            </code>
          </div>
        </div>

        {/* Device Pairing */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Device Pairing
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Enter the device ID of your ESP32 to view its sensor data. The
            device ID is set in the ESP32 Arduino sketch.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={deviceInput}
                onChange={(e) => setDeviceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveDevice()}
                placeholder="e.g. esp32-farm-001"
                className="w-full rounded-xl border border-cyan-900/20 bg-[#0a1628] py-3 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-cyan-500/50"
              />
            </div>
            <button
              onClick={handleSaveDevice}
              className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                "Pair"
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Current: <span className="text-cyan-400">{deviceId}</span>
          </p>
          <div className="mt-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-3">
            <p className="text-[11px] text-slate-500">
              Your data path: <span className="font-mono text-cyan-400">users/{userUID || "..."}/devices/{deviceId}/</span>
            </p>
          </div>
        </div>

        {/* Sensor Ranges */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Sensor Ranges
              </h3>
              <p className="text-xs text-slate-400">
                Configure optimal ranges for each sensor. Values outside these ranges trigger warnings.
              </p>
            </div>
            <button
              onClick={handleResetRanges}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-900/20 bg-[#0a1628] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {SENSOR_KEYS.map((key) => {
              const meta = SENSOR_META[key];
              const range = editingRanges[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border border-cyan-900/10 bg-[#0a1628] p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5" style={{ color: meta.hexColor }} />
                    <span className="text-xs font-medium" style={{ color: meta.hexColor }}>
                      {meta.label}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-500">
                      {meta.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Min */}
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Optimal Min
                      </label>
                      <input
                        type="number"
                        value={range.optimalMin}
                        onChange={(e) =>
                          handleRangeChange(key, "optimalMin", e.target.value)
                        }
                        className="w-full rounded-lg border border-cyan-900/20 bg-[#0c1a2e] px-3 py-2 text-xs text-white outline-none transition-colors focus:border-cyan-500/50"
                      />
                    </div>

                    {/* Dash */}
                    <span className="mt-4 text-slate-600">–</span>

                    {/* Max */}
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Optimal Max
                      </label>
                      <input
                        type="number"
                        value={range.optimalMax}
                        onChange={(e) =>
                          handleRangeChange(key, "optimalMax", e.target.value)
                        }
                        className="w-full rounded-lg border border-cyan-900/20 bg-[#0c1a2e] px-3 py-2 text-xs text-white outline-none transition-colors focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  {/* Visual range indicator */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0c1a2e]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: meta.hexColor,
                        marginLeft: `${Math.max(0, (range.optimalMin / meta.max) * 100)}%`,
                        width: `${Math.min(100 - (range.optimalMin / meta.max) * 100, ((range.optimalMax - range.optimalMin) / meta.max) * 100)}%`,
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSaveRanges}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
          >
            {rangesSaved ? (
              <>
                <Check className="h-4 w-4" />
                Saved to Cloud
              </>
            ) : (
              <>
                <Sliders className="h-4 w-4" />
                Save Ranges to Cloud
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Ranges sync across all your devices and persist after refresh
          </p>
        </div>

        {/* Theme */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Appearance
          </h3>
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
          <h3 className="mb-3 text-sm font-semibold text-white">
            Connection
          </h3>
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
                {status === "live"
                  ? "Connected"
                  : status === "stale"
                    ? "Not Responding"
                    : "Offline"}
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
            <p>Monitoring System</p>
            <p className="text-slate-500">
              Built with Next.js, Firebase, and Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
