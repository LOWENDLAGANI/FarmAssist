/**
 * SettingsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Settings page for app configuration, device pairing,
 * sensor range configuration, and info.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";
import { VisualRangeSelector, RangeNumberInput } from "../RangeSlider";
import {
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
  Bell,
  ImageIcon,
  Upload,
  Trash2,
  Volume2,
  VolumeX,
  Vibrate,
  Download,
  UploadCloud,
  HardDrive,
  Archive,
  MessageSquare,
  CircleUserRound,
} from "lucide-react";
import { isSoundEnabled, setSoundEnabled, isHapticEnabled, setHapticEnabled } from "@/lib/notificationSound";
import { getNotificationPrefs, setNotificationPref, isNotificationEnabled, type AlertSeverity } from "@/lib/notificationPreferences";
import { createBackup, downloadBackup, parseBackup, applyBackup, type BackupData } from "@/lib/backupRestore";
import { useSms } from "@/hooks/useSms";
import { useAppTheme } from "../ThemeProvider";
import { useDeviceValidation } from "@/hooks/useDeviceValidation";
import RoverOverviewCard from "../RoverOverviewCard";
import CustomThemeBuilder from "../CustomThemeBuilder";
import { formatLastSeen } from "@/lib/formatLastSeen";
import type { ConnectionStatus, SensorKey } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";
import type { SensorRanges } from "@/hooks/useSensorRanges";

import type { NotificationType } from "@/types/notifications";

interface SettingsPageProps {
  status: ConnectionStatus;
  lastUpdated?: number | null;
  deviceId: string;
  onDeviceChange: (id: string) => void;
  sensorRanges: SensorRanges;
  onRangesSave: (ranges: SensorRanges) => void;
  onRangesReset: () => void;
  userUID: string;
  onCreateNotification: (
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    deviceId: string
  ) => Promise<void>;
  backgroundMediaType: "image" | "video" | null;
  onBackgroundUpload: (file: File) => void;
  onBackgroundReset: () => void;
  /** Whether the dashboard background is blurred. */
  backgroundBlur: boolean;
  onBackgroundBlurChange: (blurred: boolean) => void;
  /** Opens the account page, where sign-in methods can be linked. */
  onOpenAccountSettings: () => void;
}

const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

function getRangeStep(sensor: SensorKey): number {
  if (sensor === "temperature") return 0.1;
  if (sensor === "light") return 10;
  return 1;
}

export default function SettingsPage({
  status,
  deviceId,
  onDeviceChange,
  sensorRanges,
  onRangesSave,
  onRangesReset,
  userUID,
  onCreateNotification,
  backgroundMediaType,
  onBackgroundUpload,
  onBackgroundReset,
  backgroundBlur,
  onBackgroundBlurChange,
  onOpenAccountSettings,
}: SettingsPageProps) {
  const { theme, setTheme, themes, customTheme, setCustomTheme, applyCustomTheme } = useAppTheme();
  const { registerDevice, unlinkDevice, status: deviceLinkStatus, registryInfo } = useDeviceValidation(userUID, deviceId);
  const [deviceInput, setDeviceInput] = useState(deviceId);
  const [saved, setSaved] = useState(false);
  const [pairFailed, setPairFailed] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [unlinked, setUnlinked] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

  // ── Sound/Haptic preferences (synced with localStorage) ──────
  const [, forceUpdate] = useState(0);
  const soundEnabled = isSoundEnabled();
  const hapticEnabled = isHapticEnabled();

  // ── Notification severity preferences ────────────────────────
  const [notifPrefs, setNotifPrefs] = useState(getNotificationPrefs);

  const toggleNotifPref = (severity: AlertSeverity) => {
    const current = notifPrefs[severity];
    setNotificationPref(severity, !current);
    setNotifPrefs(getNotificationPrefs());
  };

  // ── Import result feedback ───────────────────────────────────
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── SMS notifications (owner only) ──────────────────────────
  const sms = useSms(userUID);

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
      battery: { optimalMin: SENSOR_META.battery.optimalRange[0], optimalMax: SENSOR_META.battery.optimalRange[1] },
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

  const handleExportSettings = () => {
    const backup = createBackup({
      deviceId,
      theme,
      backgroundBlur,
      sensorRanges: editingRanges,
    });
    downloadBackup(backup);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const backup = parseBackup(text);
      if (!backup) {
        setImportResult({ success: false, message: "Invalid backup file format." });
        setTimeout(() => setImportResult(null), 3000);
        return;
      }
      const restored = applyBackup(backup);
      if (restored.deviceId) onDeviceChange(restored.deviceId);
      if (restored.sensorRanges) {
        setEditingRanges(restored.sensorRanges);
        onRangesSave(restored.sensorRanges);
      }
      setImportResult({ success: true, message: "Settings restored successfully!" });
      setTimeout(() => setImportResult(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleTestNotification = () => {
    // Fire browser notification FIRST — must be synchronous in the click gesture
    if (Notification.permission === "granted" && isNotificationEnabled("info")) {
      new Notification("FarmAssist Test", {
        body: `Notifications are working for Rover "${deviceId}"!`,
        icon: "/favicon.ico",
      });
    }
    // Then write to notification center (fire-and-forget)
    if (isNotificationEnabled("info")) {
      onCreateNotification(
        userUID,
        "sensor_alert",
        "Test Notification",
        `This is a test notification for Rover "${deviceId}". If you see this, notifications are working!`,
        deviceId
      );
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400">
          Configure your FarmAssist dashboard
        </p>
      </div>

      <div className="space-y-4">
        {/* Rover Overview */}
        <div className="animate-slide-up stagger-1">
          <RoverOverviewCard
            deviceId={deviceId}
            connectionStatus={status}
            linkStatus={deviceLinkStatus}
            registryInfo={registryInfo}
          />
        </div>

        {/* Account sign-in settings */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
              <CircleUserRound className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white">Account Settings</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Bind or link a Google account as another way to sign in.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAccountSettings}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Link className="h-4 w-4" />
            Bind / Link Account
          </button>
        </div>

        {/* User UID (for ESP32 pairing) */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-2">
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
              className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
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
              Don't forget to activate your account with the Rover.
              
            </p>
            <code className="mt-1 block rounded bg-[#0a1628] px-2 py-1 text-xs text-cyan-400 font-mono">
              #Here is your account UID: &quot;{userUID}&quot;
            </code>
          </div>
        </div>

        {/* Dashboard Background */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-3">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Dashboard Background</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Upload a photo or a muted video to use behind the dashboard.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30">
              <Upload className="h-4 w-4" />
              Upload {backgroundMediaType ? "new media" : "photo or video"}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onBackgroundUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {backgroundMediaType && (
              <button
                type="button"
                onClick={onBackgroundReset}
                className="flex items-center gap-2 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2.5 text-sm text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
                Use default image
              </button>
            )}
          </div>
          {/* Blur toggle */}
          <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Blur background</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Soften the background so dashboard content stays readable. On by default.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={backgroundBlur}
              aria-label="Blur background"
              onClick={() => onBackgroundBlurChange(!backgroundBlur)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                backgroundBlur ? "bg-cyan-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
                  backgroundBlur ? "left-[1.375rem]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {backgroundMediaType
              ? `Custom ${backgroundMediaType} active. It is saved in this browser.`
              : "Using the default background image."}
          </p>
        </div>

        {/* Device Pairing */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-3">
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
                className="w-full rounded-xl border border-cyan-900/20 bg-[#0a1628] py-3 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <button
              onClick={handleSaveDevice}
              className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
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
                  className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-950/20 px-2.5 py-1 text-[10px] text-red-400 transition-all hover:border-red-500/40 hover:bg-red-950/40 hover:scale-[1.02] active:scale-[0.98]"
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
                  Rover is paired to another account — ask the owner to unlink it
                </p>
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
                  Rover is already paired to another account — ask the owner to unlink it first
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
          </div>

          {/* Unlink confirmation dialog */}
          {showUnlinkConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowUnlinkConfirm(false)}
              />
              <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-red-500/30 bg-[#0c1a2e] p-0 shadow-2xl shadow-red-950/50 animate-scale-in">
                <div className="flex items-center justify-between border-b border-red-900/30 bg-red-950/30 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Unlink Rover</h3>
                  </div>
                  <button
                    onClick={() => setShowUnlinkConfirm(false)}
                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
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
                    className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnlinkDevice}
                    className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Unlink Rover
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sensor Ranges */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-4">
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
              className="flex items-center gap-1.5 rounded-lg border border-cyan-900/20 bg-[#0a1628] px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white hover:scale-[1.02] active:scale-[0.98]"
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
                  className="rounded-xl border border-cyan-900/10 bg-[#0a1628] p-4 transition-all hover:border-cyan-800/30"
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
                      className="h-full rounded-full transition-all"
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
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
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Appearance
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Choose a theme that suits your preference
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === "custom") {
                    setShowCustomBuilder(true);
                  } else {
                    setTheme(t.id);
                  }
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all hover:scale-[1.03] active:scale-[0.97] ${
                  theme === t.id
                    ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                    : "border-cyan-900/20 bg-[#0a1628] hover:border-cyan-800/30 hover:bg-[#0f2240]"
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className={`text-xs font-medium ${theme === t.id ? "text-cyan-400" : "text-slate-300"}`}>
                  {t.name}
                </span>
                {theme === t.id && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-cyan-400">
                    <RefreshCw className="h-2.5 w-2.5" />
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom Theme Builder Modal */}
          {showCustomBuilder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowCustomBuilder(false)}
              />
              <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0c1a2e] p-6 shadow-2xl shadow-cyan-950/50 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Custom Theme</h3>
                  <button
                    onClick={() => setShowCustomBuilder(false)}
                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CustomThemeBuilder onClose={() => setShowCustomBuilder(false)} />
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-6">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Notifications
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Test that push notifications and the notification center are working correctly.
          </p>
          <button
            onClick={handleTestNotification}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Bell className="h-4 w-4" />
            Send Test Notification
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            A browser notification and an in-app notification will be sent.
          </p>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-6">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Alert Preferences
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Choose which alert severity levels you want to receive. Critical alerts are always recommended for safety.
          </p>
          <div className="space-y-2">
            {/* Critical */}
            <button
              type="button"
              onClick={() => toggleNotifPref("critical")}
              className="flex w-full items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🚨</span>
                <div>
                  <span className="text-sm text-slate-300">Critical Alerts</span>
                  <p className="text-[10px] text-slate-500">Water empty, extreme temps, rover offline</p>
                </div>
              </div>
              <span className={`text-xs font-medium ${notifPrefs.critical ? "text-cyan-400" : "text-slate-500"}`}>
                {notifPrefs.critical ? "On" : "Off"}
              </span>
            </button>
            {/* Warning */}
            <button
              type="button"
              onClick={() => toggleNotifPref("warning")}
              className="flex w-full items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <div>
                  <span className="text-sm text-slate-300">Warning Alerts</span>
                  <p className="text-[10px] text-slate-500">Sensor outside optimal range</p>
                </div>
              </div>
              <span className={`text-xs font-medium ${notifPrefs.warning ? "text-cyan-400" : "text-slate-500"}`}>
                {notifPrefs.warning ? "On" : "Off"}
              </span>
            </button>
            {/* Info */}
            <button
              type="button"
              onClick={() => toggleNotifPref("info")}
              className="flex w-full items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">ℹ️</span>
                <div>
                  <span className="text-sm text-slate-300">Info Notifications</span>
                  <p className="text-[10px] text-slate-500">General updates and test alerts</p>
                </div>
              </div>
              <span className={`text-xs font-medium ${notifPrefs.info ? "text-cyan-400" : "text-slate-500"}`}>
                {notifPrefs.info ? "On" : "Off"}
              </span>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Settings are saved locally in your browser.
          </p>
        </div>

        {/* Connection Info */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-6">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Connection
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]">
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
            <div className="flex items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Database</span>
              </div>
              <span className="text-xs text-slate-400">Realtime DB</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Device</span>
              </div>
              <span className="text-xs text-slate-400">ESP32-S3</span>
            </div>
          </div>
        </div>

        {/* Sound & Haptic Feedback */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Sound & Haptic Feedback</h3>
          <p className="mb-3 text-xs text-slate-400">
            Control notification sounds and vibration on critical events.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                const next = !isSoundEnabled();
                setSoundEnabled(next);
                forceUpdate((n) => n + 1);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]"
            >
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-sm text-slate-300">Notification Sounds</span>
              </div>
              <span className={`text-xs font-medium ${soundEnabled ? "text-cyan-400" : "text-slate-500"}`}>
                {soundEnabled ? "On" : "Off"}
              </span>
            </button>
            <button
              onClick={() => {
                const next = !isHapticEnabled();
                setHapticEnabled(next);
                forceUpdate((n) => n + 1);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-[#0a1628] p-3 transition-all hover:bg-[#0f2240]"
            >
              <div className="flex items-center gap-2">
                <Vibrate className={`h-4 w-4 ${hapticEnabled ? "text-cyan-400" : "text-slate-400"}`} />
                <span className="text-sm text-slate-300">Haptic Feedback</span>
              </div>
              <span className={`text-xs font-medium ${hapticEnabled ? "text-cyan-400" : "text-slate-500"}`}>
                {hapticEnabled ? "On" : "Off"}
              </span>
            </button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-6">
          <h3 className="mb-3 text-sm font-semibold text-white">Backup & Restore</h3>
          <p className="mb-3 text-xs text-slate-400">
            Export your settings to a file, or import a backup.
          </p>
          <div className="space-y-2">
            <button
              onClick={handleExportSettings}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Export Settings
            </button>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-[#0f2240] hover:text-white">
              <UploadCloud className="h-4 w-4" />
              Import Settings
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
              />
            </label>
            {importResult && (
              <p className={`text-center text-xs ${importResult.success ? "text-emerald-400" : "text-red-400"}`}>
                {importResult.message}
              </p>
            )}
          </div>
        </div>

        {/* SMS Notifications (owner only) */}
        {sms.isOwner && (
          <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-6">
            <h3 className="mb-1 text-sm font-semibold text-white">SMS Alerts</h3>
            <p className="mb-3 text-xs text-slate-400">
              Receive an SMS when your Rover goes offline. Only offline alerts are sent via SMS — all other notifications stay in-app.
            </p>

            {/* Phone number input */}
            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-500">Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={sms.phoneNumber}
                  onChange={(e) => sms.savePhoneNumber(e.target.value)}
                  placeholder="+66xxxxxxxxx"
                  className="flex-1 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                Include country code (e.g. +66 for Thailand)
              </p>
            </div>

            {/* Test SMS button */}
            <button
              onClick={sms.sendTestSms}
              disabled={sms.sending || !sms.phoneNumber}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-cyan-500/20 disabled:hover:scale-100"
            >
              {sms.sending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  Sending…
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Send Test SMS
                </>
              )}
            </button>

            {/* Send result */}
            {sms.sendResult && (
              <p className={`mt-2 text-center text-xs ${sms.sendResult.success ? "text-emerald-400" : "text-red-400"}`}>
                {sms.sendResult.message}
              </p>
            )}
          </div>
        )}

        {/* About */}
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5 animate-slide-up stagger-7">
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
