/**
 * SettingsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Settings page for app configuration, device pairing,
 * sensor range configuration, and info.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useState } from "react";
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
  Unlink,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAppTheme } from "../ThemeProvider";
import { useDeviceValidation } from "@/hooks/useDeviceValidation";
import RoverOverviewCard from "../RoverOverviewCard";
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

function getRangeStep(sensor: SensorKey): number {
  if (sensor === "temperature") return 0.1;
  if (sensor === "light") return 10;
  return 1;
}

function getRangePercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

/** Format a lastSeen timestamp into a human-readable relative string. */
function formatLastSeen(lastSeenMs: number): string {
  const now = Date.now();
  const diffMs = now - lastSeenMs;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  return `${diffDay}d ${diffHr % 24}h ago`;
}

interface VisualRangeSelectorProps {
  label: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (field: "optimalMin" | "optimalMax", value: number) => void;
}

interface RangeNumberInputProps {
  label: string;
  value: number;
  step: number;
  onCommit: (value: number) => void;
}

function RangeNumberInput({ label, value, step, onCommit }: RangeNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setDraft(String(value));
  }, [isEditing, value]);

  const commit = () => {
    const parsed = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(parsed)) {
      onCommit(parsed);
    } else {
      setDraft(String(value));
    }
    setIsEditing(false);
  };

  return (
    <input
      type="number"
      value={draft}
      step={step}
      inputMode="decimal"
      aria-label={label}
      onFocus={() => setIsEditing(true)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="w-full rounded-lg border border-cyan-900/20 bg-[#0c1a2e] px-3 py-2 text-xs text-white outline-none transition-colors focus:border-cyan-500/50"
    />
  );
}

function VisualRangeSelector({
  label,
  unit,
  color,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
}: VisualRangeSelectorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"optimalMin" | "optimalMax" | null>(null);

  const updateFromPointer = (
    clientX: number,
    handle: "optimalMin" | "optimalMax"
  ) => {
    const track = trackRef.current;
    if (!track) return;

    const bounds = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const rawValue = min + ratio * (max - min);
    const snappedValue = Number((Math.round(rawValue / step) * step).toFixed(6));
    onChange(handle, snappedValue);
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const minX = getRangePercent(valueMin, min, max);
    const maxX = getRangePercent(valueMax, min, max);
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const handle = Math.abs(pointerX - minX) <= Math.abs(pointerX - maxX)
      ? "optimalMin"
      : "optimalMax";

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(handle);
    updateFromPointer(event.clientX, handle);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) updateFromPointer(event.clientX, dragging);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
  };

  const handleKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    handle: "optimalMin" | "optimalMax"
  ) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowUp"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : 0;
    if (!direction) return;

    event.preventDefault();
    onChange(handle, (handle === "optimalMin" ? valueMin : valueMax) + direction * step);
  };

  const minPercent = getRangePercent(valueMin, min, max);
  const maxPercent = getRangePercent(valueMax, min, max);

  return (
    <div className="mt-4 rounded-xl border border-cyan-900/20 bg-[#0c1a2e] px-3 py-3">
      <div className="mb-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>{min} {unit}</span>
        <span className="font-medium text-slate-400">Drag either handle to set the optimal range</span>
        <span>{max} {unit}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-9 touch-none select-none"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#131f35]" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          style={{ backgroundColor: color, left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        {(["optimalMin", "optimalMax"] as const).map((handle) => {
          const value = handle === "optimalMin" ? valueMin : valueMax;
          const percent = handle === "optimalMin" ? minPercent : maxPercent;
          return (
            <button
              key={handle}
              type="button"
              role="slider"
              aria-label={`${label} optimal ${handle === "optimalMin" ? "minimum" : "maximum"}`}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={`${value} ${unit}`}
              onKeyDown={(event) => handleKeyboard(event, handle)}
              className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0c1a2e] bg-sky-100 shadow-[0_0_0_2px_#22d3ee,0_2px_8px_rgba(6,182,212,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              style={{ left: `${percent}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs font-medium">
        <span style={{ color }}>{valueMin} {unit}</span>
        <span style={{ color }}>{valueMax} {unit}</span>
      </div>
    </div>
  );
}

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
  const { registerDevice, forceRegisterDevice, unlinkDevice, status: deviceLinkStatus, registryInfo } = useDeviceValidation(userUID, deviceId);
  const [deviceInput, setDeviceInput] = useState(deviceId);
  const [saved, setSaved] = useState(false);
  const [pairFailed, setPairFailed] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [showForcePairConfirm, setShowForcePairConfirm] = useState(false);
  const [unlinked, setUnlinked] = useState(false);
  const [forcePaired, setForcePaired] = useState(false);

  // ── Local editing state for ranges ──────────────────────────
  const [editingRanges, setEditingRanges] = useState<SensorRanges>(sensorRanges);
  const [rangesSaved, setRangesSaved] = useState(false);

  const handleSaveDevice = async () => {
    const trimmed = deviceInput.trim();
    if (trimmed.length === 0) return;
    onDeviceChange(trimmed);
    const success = await registerDevice(userUID, trimmed);
    if (success) {
      setSaved(true);
      setPairFailed(false);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setPairFailed(true);
      setTimeout(() => setPairFailed(false), 3000);
    }
  };

  const handleForcePair = async () => {
    await forceRegisterDevice(userUID, deviceId);
    setShowForcePairConfirm(false);
    setForcePaired(true);
    setTimeout(() => setForcePaired(false), 2000);
  };

  const handleRangeChange = (sensor: SensorKey, field: "optimalMin" | "optimalMax", value: number) => {
    if (Number.isNaN(value)) return;

    const meta = SENSOR_META[sensor];
    const step = getRangeStep(sensor);

    setEditingRanges((prev) => {
      const current = prev[sensor];
      const lowerBound = meta.min;
      const upperBound = meta.max;
      const nextValue = Math.min(upperBound, Math.max(lowerBound, value));

      return {
        ...prev,
        [sensor]: field === "optimalMin"
          ? {
              optimalMin: Math.min(nextValue, upperBound - step),
              // Moving the minimum past the maximum brings the maximum along.
              optimalMax: Math.max(current.optimalMax, Math.min(nextValue, upperBound - step) + step),
            }
          : {
              // Moving the maximum below the minimum brings the minimum along.
              optimalMin: Math.min(current.optimalMin, Math.max(nextValue, lowerBound + step) - step),
              optimalMax: Math.max(nextValue, lowerBound + step),
            },
      };
    });
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

  const handleUnlinkDevice = async () => {
    await unlinkDevice(userUID, deviceId);
    setShowUnlinkConfirm(false);
    setUnlinked(true);
    setTimeout(() => setUnlinked(false), 2000);
  };

  const isTaken = deviceLinkStatus === "taken";

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
        {/* Rover Overview */}
        <RoverOverviewCard
          deviceId={deviceId}
          connectionStatus={status}
          linkStatus={deviceLinkStatus}
          registryInfo={registryInfo}
        />

        {/* User UID (for ESP32 pairing) */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Your User ID
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            This is your unique UID. The Rover connects to your account using this ID. The UID gives you permission to view the data <code className="rounded bg-[#0a1628] px-1 text-cyan-400">USER_UID</code>.
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
              ⚠️ Don't forget to activate your account with the Rover.
              Change the <code className="font-mono">USER_UID</code> define to:
            </p>
            <code className="mt-1 block rounded bg-[#0a1628] px-2 py-1 text-xs text-cyan-400 font-mono">
              #Here is your account UID: &quot;{userUID}&quot;
            </code>
          </div>
        </div>

        {/* Device Pairing */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Rover ID
          </h3>
          <p className="mb-3 text-xs text-slate-400">
           Enter the Rover's ID below to pair it with your account. Please make sure the Rover ID is matched with the one linked with your account.
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

          {/* Device link status indicator */}
          <div className="mt-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-3">
            {deviceLinkStatus === "linked" && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="flex-1 text-[11px] text-emerald-400">
                  Rover is linked to your account
                </p>
                <button
                  onClick={() => setShowUnlinkConfirm(true)}
                  className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-950/20 px-2.5 py-1 text-[10px] text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-950/40"
                >
                  <Unlink className="h-3 w-3" />
                  Unlink
                </button>
              </div>
            )}
            {deviceLinkStatus === "linked" && registryInfo?.lastSeen && (
              <div className="mt-2 flex items-center gap-2 border-t border-cyan-900/20 pt-2">
                <p className="text-[10px] text-slate-500">
                  Last seen: <span className="text-slate-400">{formatLastSeen(registryInfo.lastSeen)}</span>
                </p>
              </div>
            )}
            {isTaken && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <p className="flex-1 text-[11px] text-red-400">
                  Rover is paired to another account
                </p>
                <button
                  onClick={() => setShowForcePairConfirm(true)}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-1 text-[10px] text-amber-400 transition-colors hover:border-amber-500/40 hover:bg-amber-950/40"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Force Pair
                </button>
              </div>
            )}
            {deviceLinkStatus === "unregistered" && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <p className="text-[11px] text-cyan-400">
                  Rover not yet paired — click &quot;Pair&quot; after updating the Rover&apos;s User UID
                </p>
              </div>
            )}
            {deviceLinkStatus === "loading" && (
              <p className="text-[11px] text-slate-500">Checking link status…</p>
            )}
            {pairFailed && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-[11px] text-amber-400">
                  Rover is already paired to another account — use Force Pair
                </p>
              </div>
            )}
            {unlinked && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <p className="text-[11px] text-red-400">
                  Rover unlinked
                </p>
              </div>
            )}
            {forcePaired && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-[11px] text-amber-400">
                  Ownership claimed — update the Rover&apos;s USER_UID
                </p>
              </div>
            )}
          </div>

          {/* Force Pair confirmation dialog */}
          {showForcePairConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowForcePairConfirm(false)}
              />
              <div className="relative w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#0c1a2e] p-0 shadow-2xl shadow-amber-950/50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-amber-900/30 bg-amber-950/30 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Force Pair Rover</h3>
                  </div>
                  <button
                    onClick={() => setShowForcePairConfirm(false)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    This will take ownership of Rover <span className="font-mono text-cyan-400">{deviceId}</span> from the other account.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    The previous owner will lose access to live data. You must also update the Rover&apos;s <code className="font-mono text-cyan-400">USER_UID</code> via its config portal.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-cyan-900/20 px-6 py-4">
                  <button
                    onClick={() => setShowForcePairConfirm(false)}
                    className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleForcePair}
                    className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
                  >
                    Force Pair
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unlink confirmation dialog */}
          {showUnlinkConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowUnlinkConfirm(false)}
              />
              <div className="relative w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#0c1a2e] p-0 shadow-2xl shadow-red-950/50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-red-900/30 bg-red-950/30 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Unlink Rover</h3>
                  </div>
                  <button
                    onClick={() => setShowUnlinkConfirm(false)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    This will remove the pairing between your account and Rover <span className="font-mono text-cyan-400">{deviceId}</span>.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    You will stop receiving live data until you pair it again. A different account will then be able to pair this Rover.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-cyan-900/20 px-6 py-4">
                  <button
                    onClick={() => setShowUnlinkConfirm(false)}
                    className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnlinkDevice}
                    className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
                  >
                    Unlink Rover
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sensor Ranges */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Sensor Range
              </h3>
              <p className="text-xs text-slate-400">
                Select the optimal ranges for your plants. The dashboard will highlight when readings are outside these ranges.
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
              const step = getRangeStep(key);
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

                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    {/* Min */}
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Optimal Min
                      </label>
                      <RangeNumberInput
                        label={`${meta.label} optimal minimum`}
                        value={range.optimalMin}
                        step={step}
                        onCommit={(value) => handleRangeChange(key, "optimalMin", value)}
                      />
                    </div>

                    {/* Dash */}
                    <span className="mt-4 text-slate-600">–</span>

                    {/* Max */}
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Optimal Max
                      </label>
                      <RangeNumberInput
                        label={`${meta.label} optimal maximum`}
                        value={range.optimalMax}
                        step={step}
                        onCommit={(value) => handleRangeChange(key, "optimalMax", value)}
                      />
                    </div>
                  </div>

                  <VisualRangeSelector
                    label={meta.label}
                    unit={meta.unit}
                    color={meta.hexColor}
                    min={meta.min}
                    max={meta.max}
                    step={step}
                    valueMin={range.optimalMin}
                    valueMax={range.optimalMax}
                    onChange={(field, value) => handleRangeChange(key, field, value)}
                  />

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
            Ranges will be synced to all devices connected to your account.
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
            <p>Contact Support: myrealmetvreal@gmail.com</p>
            <p className="text-slate-500">
              Built with Love By Minetallest😘😘😘. All rights reserved. &copy; 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
