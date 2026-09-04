/**
 * RoverScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Layout used when "Rover Screen Mode" is enabled in Settings.
 *
 * Optimized for the 7-inch touchscreen mounted on the Rover:
 *  • Compact header with live connection + battery status
 *  • Big side navigation rail (bottom bar on narrow screens) with
 *    generous tap targets so everything stays easy to click
 *  • A neatly organized home ("Monitor") with at-a-glance live
 *    readings and quick-action tiles that jump to the pages
 *
 * The normal Sidebar / TopBar / BottomNav chrome is replaced by
 * this component while the rest of the app's pages render inside.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { ReactNode } from "react";
import {
  MonitorSmartphone,
  LayoutDashboard,
  SlidersHorizontal,
  Bell,
  Clock,
  Settings,
  Thermometer,
  Sprout,
  Waves,
  Sun,
  Battery,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ConnectionStatus, SensorKey } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";
import type { SensorRanges } from "@/hooks/useSensorRanges";

/* ── Shared navigation definition ─────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** Pages exposed on the rover screen — everything the operator needs. */
const ROVER_NAV: NavItem[] = [
  { id: "dashboard", label: "Monitor", icon: LayoutDashboard },
  { id: "control", label: "Control", icon: SlidersHorizontal },
  { id: "history", label: "History", icon: Clock },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

interface RoverNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Show a pulsing alert dot on the Settings tile. */
  settingsAlert?: boolean;
  /** Number of unread notifications — badge on the Alerts tile. */
  unreadCount?: number;
}

function NavBadge({
  item,
  settingsAlert,
  unreadCount,
}: {
  item: NavItem;
  settingsAlert?: boolean;
  unreadCount?: number;
}) {
  if (item.id === "notifications" && unreadCount && unreadCount > 0) {
    return (
      <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    );
  }
  if (item.id === "settings" && settingsAlert) {
    return <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse-dot" />;
  }
  return null;
}

/** Big vertical tap targets on the left (desktop / landscape ≥768px). */
function RoverNavRail({ activePage, onNavigate, settingsAlert, unreadCount }: RoverNavProps) {
  return (
    <aside
      aria-label="Rover navigation"
      className="hidden w-[88px] shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-cyan-900/20 bg-[#0a1628] p-2 md:flex"
    >
      {ROVER_NAV.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-cyan-400 hover:scale-[1.03] active:scale-[0.97] ${
              isActive
                ? "bg-cyan-500/15 text-cyan-400 shadow-lg shadow-cyan-500/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <span className="relative">
              <Icon className={`h-5 w-5 ${isActive ? "scale-110" : ""}`} />
              <NavBadge item={item} settingsAlert={settingsAlert} unreadCount={unreadCount} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

/** Horizontal big tap targets along the bottom (phones / narrow screens). */
function RoverBottomNav({ activePage, onNavigate, settingsAlert, unreadCount }: RoverNavProps) {
  return (
    <nav
      aria-label="Rover navigation"
      className="flex h-[calc(4.25rem+env(safe-area-inset-bottom))] shrink-0 items-center justify-around border-t border-cyan-900/20 bg-[#0a1628] px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ROVER_NAV.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
              isActive ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              <NavBadge item={item} settingsAlert={settingsAlert} unreadCount={unreadCount} />
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Compact header: brand, device, live connection + battery. */
function RoverTopBar({
  status,
  deviceId,
  batteryLevel,
}: {
  status: ConnectionStatus;
  deviceId: string;
  batteryLevel?: number | null;
}) {
  const isLive = status === "live";
  const isStale = status === "stale";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-cyan-900/20 bg-[#0a1628] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
          <MonitorSmartphone className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold leading-tight text-white">FarmAssist</h1>
          <p className="text-[10px] leading-tight text-slate-500">Rover screen</p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {/* Device */}
        <span className="hidden max-w-[160px] truncate rounded-lg bg-cyan-500/10 px-2 py-1 font-mono text-[11px] text-cyan-400 sm:inline">
          {deviceId}
        </span>

        {/* Battery */}
        {batteryLevel != null && (
          <span className="flex items-center gap-1 rounded-lg bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-300">
            <Battery
              className={`h-4 w-4 ${
                batteryLevel > 50 ? "text-emerald-400" : batteryLevel > 20 ? "text-amber-400" : "text-red-400"
              }`}
            />
            {Math.round(batteryLevel)}%
          </span>
        )}

        {/* Connection */}
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isLive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : isStale
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {isLive ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          {isLive ? "Live" : isStale ? "Not Responding" : "Offline"}
        </span>
      </div>
    </header>
  );
}

/* ── Main rover shell ─────────────────────────────────────────── */

interface RoverScreenProps {
  activePage: string;
  onNavigate: (page: string) => void;
  status: ConnectionStatus;
  deviceId: string;
  batteryLevel?: number | null;
  /** Show a pulsing alert dot on the Settings tile. */
  settingsAlert?: boolean;
  /** Number of unread notifications — badge on the Alerts tile. */
  unreadCount?: number;
  children: ReactNode;
}

export default function RoverScreen({
  activePage,
  onNavigate,
  status,
  deviceId,
  batteryLevel,
  settingsAlert,
  unreadCount,
  children,
}: RoverScreenProps) {
  const navProps = { activePage, onNavigate, settingsAlert, unreadCount };

  return (
    <>
      {/* Side rail (landscape / ≥768px) */}
      <RoverNavRail {...navProps} />

      {/* Content column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RoverTopBar status={status} deviceId={deviceId} batteryLevel={batteryLevel} />
        <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>

      {/* Bottom bar (portrait / <768px) */}
      <RoverBottomNav {...navProps} />
    </>
  );
}

/* ── Compact rover home ("Monitor") ───────────────────────────── */

const ROVER_SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light", "battery"];

const SENSOR_ICONS: Record<SensorKey, LucideIcon> = {
  temperature: Thermometer,
  moisture: Sprout,
  waterLevel: Waves,
  light: Sun,
  battery: Battery,
};

/** Sensors that can open the full-screen chart (battery has no chart). */
const CHARTABLE_SENSORS = new Set<SensorKey>(["temperature", "moisture", "waterLevel", "light"]);

type ReadoutTone = "good" | "warn" | "critical" | "none";

function getReadout(
  sensor: SensorKey,
  value: number | null,
  optimalMin: number,
  optimalMax: number
): { tone: ReadoutTone; label: string } {
  if (value === null) return { tone: "none", label: "No Data" };
  if (value >= optimalMin && value <= optimalMax) return { tone: "good", label: "Good" };
  // Critical thresholds shared with the dashboard alert logic.
  const critical =
    (sensor === "waterLevel" && value < 10) ||
    (sensor === "temperature" && (value > 45 || value < 5)) ||
    (sensor === "battery" && value < 10);
  return critical ? { tone: "critical", label: "Critical" } : { tone: "warn", label: "Warning" };
}

const TONE_DOT: Record<ReadoutTone, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  critical: "bg-red-400",
  none: "bg-slate-600",
};

const TONE_TEXT: Record<ReadoutTone, string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  critical: "text-red-400",
  none: "text-slate-500",
};

const TONE_BAR: Record<ReadoutTone, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  critical: "bg-red-400",
  none: "bg-slate-700",
};

/** Big readable number (light is formatted with k for thousands). */
function formatSensorValue(sensor: SensorKey, value: number): string {
  if (sensor === "temperature") return value.toFixed(1);
  if (sensor === "light") {
    if (value >= 10000) return `${Math.round(value / 1000)}k`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(Math.round(value));
  }
  return String(Math.round(value));
}

interface RoverHomeProps {
  /** Latest live sensor values (null while unknown). */
  values: Record<SensorKey, number | null>;
  /** User-configured optimal ranges. */
  ranges: SensorRanges;
  /** Number of unread notifications — badge on the Alerts tile. */
  unreadCount?: number;
  /** Open the full-screen chart for a sensor. */
  onOpenSensor: (key: SensorKey) => void;
  /** Navigate to another page. */
  onNavigate: (page: string) => void;
  /** Optional quick way back to the normal layout (only shown when provided). */
  onExitRoverMode?: () => void;
}

/** Home screen for the rover display — everything at a glance. */
export function RoverHome({
  values,
  ranges,
  unreadCount = 0,
  onOpenSensor,
  onNavigate,
  onExitRoverMode,
}: RoverHomeProps) {
  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4">
      {/* ── Live readings ── */}
      <section aria-label="Live readings">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/15">
            <MonitorSmartphone className="h-3.5 w-3.5 text-cyan-400" />
          </span>
          Live Readings
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-2.5">
          {ROVER_SENSOR_KEYS.map((sensor) => {
            const meta = SENSOR_META[sensor];
            const Icon = SENSOR_ICONS[sensor];
            const value = values[sensor];
            const range = ranges[sensor] ?? {
              optimalMin: meta.optimalRange[0],
              optimalMax: meta.optimalRange[1],
            };
            const readout = getReadout(sensor, value, range.optimalMin, range.optimalMax);
            const chartable = CHARTABLE_SENSORS.has(sensor) && value !== null;
            const pct =
              value === null
                ? 0
                : Math.min(100, Math.max(0, ((value - meta.min) / (meta.max - meta.min)) * 100));

            const body = (
              <>
                {/* Icon + label + status */}
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4" style={{ color: meta.hexColor }} />
                    <span className="truncate text-[11px] font-medium text-slate-300 sm:text-xs">
                      {meta.label}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[readout.tone]}`} />
                    <span className={`text-[10px] font-semibold ${TONE_TEXT[readout.tone]}`}>
                      {readout.label}
                    </span>
                  </span>
                </div>

                {/* Big value */}
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
                    {value === null ? "—" : formatSensorValue(sensor, value)}
                  </span>
                  <span className="text-[11px] text-slate-500">{meta.unit}</span>
                </div>

                {/* Range bar */}
                <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${TONE_BAR[readout.tone]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="text-[10px] text-slate-500">
                  {chartable
                    ? "Tap for chart"
                    : value !== null
                      ? `Ideal ${range.optimalMin}–${range.optimalMax}${meta.unit}`
                      : "Waiting for data"}
                </span>
              </>
            );

            return (
              <button
                key={sensor}
                type="button"
                disabled={!chartable}
                onClick={() => chartable && onOpenSensor(sensor)}
                aria-label={
                  chartable ? `Open ${meta.label} chart` : `${meta.label} reading`
                }
                className={`group flex min-h-[120px] flex-col gap-1 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-3 text-left transition-all duration-200 sm:min-h-[140px] sm:p-4 ${
                  chartable
                    ? "cursor-pointer hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98]"
                    : "cursor-default"
                }`}
              >
                {body}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section aria-label="Quick actions">
        <h2 className="mb-2 text-sm font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("control")}
            className="group flex items-center gap-3 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-3.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2.5 sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 transition-transform group-hover:scale-110">
              <SlidersHorizontal className="h-5 w-5 text-cyan-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">Control</span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Pump, lights & spray
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("history")}
            className="group flex items-center gap-3 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-3.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2.5 sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 transition-transform group-hover:scale-110">
              <Clock className="h-5 w-5 text-emerald-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">History</span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Sessions & logs
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("notifications")}
            className="group relative flex items-center gap-3 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-3.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2.5 sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 transition-transform group-hover:scale-110">
              <Bell className="h-5 w-5 text-amber-400" />
            </span>
            {unreadCount > 0 && (
              <span className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">Alerts</span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Latest warnings
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="group flex items-center gap-3 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-3.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2.5 sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/15 transition-transform group-hover:scale-110">
              <Settings className="h-5 w-5 text-slate-300" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">Settings</span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Pairing & options
              </span>
            </span>
          </button>
        </div>
      </section>

      {/* ── Back to the normal layout ── */}
      {onExitRoverMode && (
        <button
          type="button"
          onClick={onExitRoverMode}
          className="mx-auto flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-500 transition-colors hover:text-cyan-400"
        >
          <MonitorSmartphone className="h-3.5 w-3.5" />
          Turn off rover screen mode
        </button>
      )}
    </div>
  );
}
