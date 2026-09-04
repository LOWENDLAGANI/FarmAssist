/**
 * RoverScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Layout used when "Rover Screen Mode" is enabled in Settings.
 *
 * Optimized for the 7-inch touchscreen mounted on the Rover:
 *  • Compact header with live connection + battery status
 *  • Big side navigation rail (bottom bar on narrow screens) with
 *    generous tap targets so everything stays easy to click
 *  • A full-screen home ("Monitor") that fills the whole display:
 *    large live-reading tiles stretch to use every pixel of the
 *    7-inch panel, with a dock of big quick-action buttons pinned
 *    along the bottom — no empty space, everything easy to read
 *    at a glance.
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
      <span className="absolute -right-2 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0a1628]">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    );
  }
  if (item.id === "settings" && settingsAlert) {
    return <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse-dot" />;
  }
  return null;
}

/** Big vertical tap targets on the left (desktop / landscape ≥768px). */
function RoverNavRail({ activePage, onNavigate, settingsAlert, unreadCount }: RoverNavProps) {
  return (
    <aside
      aria-label="Rover navigation"
      className="hidden w-24 shrink-0 flex-col gap-2 overflow-y-auto border-r border-cyan-900/20 bg-[#0a1628] p-2.5 md:flex"
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
            className={`flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-cyan-400 hover:scale-[1.03] active:scale-[0.97] ${
              isActive
                ? "bg-cyan-500/15 text-cyan-400 shadow-lg shadow-cyan-500/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <span className="relative">
              <Icon className={`h-6 w-6 ${isActive ? "scale-110" : ""}`} />
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
      className="flex h-[calc(4.75rem+env(safe-area-inset-bottom))] shrink-0 items-center justify-around border-t border-cyan-900/20 bg-[#0a1628] px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
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
            className={`flex min-h-14 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
              isActive ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400"
            }`}
          >
            <span className="relative">
              <Icon className="h-6 w-6" />
              <NavBadge item={item} settingsAlert={settingsAlert} unreadCount={unreadCount} />
            </span>
            <span className="text-[11px] font-medium">{item.label}</span>
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-cyan-900/20 bg-[#0a1628] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
          <MonitorSmartphone className="h-5.5 w-5.5 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold leading-tight text-white">FarmAssist</h1>
          <p className="text-[11px] leading-tight text-slate-500">Rover screen</p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {/* Device */}
        <span className="hidden max-w-[180px] truncate rounded-lg bg-cyan-500/10 px-2.5 py-1.5 font-mono text-xs text-cyan-400 sm:inline">
          {deviceId}
        </span>

        {/* Battery */}
        {batteryLevel != null && (
          <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-xs font-semibold text-slate-300">
            <Battery
              className={`h-4.5 w-4.5 ${
                batteryLevel > 50 ? "text-emerald-400" : batteryLevel > 20 ? "text-amber-400" : "text-red-400"
              }`}
            />
            {Math.round(batteryLevel)}%
          </span>
        )}

        {/* Connection */}
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
            isLive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : isStale
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {isLive ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
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

const TONE_CHIP: Record<ReadoutTone, string> = {
  good: "bg-emerald-400/10",
  warn: "bg-amber-400/10",
  critical: "bg-red-400/10",
  none: "bg-slate-500/10",
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

/** Bottom dock of large quick-action buttons. */
const QUICK_ACTIONS: {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    id: "control",
    label: "Control",
    hint: "Pump, lights & spray",
    icon: SlidersHorizontal,
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
  },
  {
    id: "history",
    label: "History",
    hint: "Sessions & logs",
    icon: Clock,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  {
    id: "notifications",
    label: "Alerts",
    hint: "Latest warnings",
    icon: Bell,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  {
    id: "settings",
    label: "Settings",
    hint: "Pairing & options",
    icon: Settings,
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-300",
  },
];

/**
 * Home screen for the rover display — everything at a glance.
 *
 * Designed to fill the whole 7-inch panel:
 *  • the live-reading tiles are a flexible grid that stretches to
 *    consume all leftover vertical space (so there is never an
 *    empty band at the bottom), with values that scale up with
 *    the screen;
 *  • quick actions live in a bottom dock so the most-used tools
 *    are always one thumb-tap away.
 */
export function RoverHome({
  values,
  ranges,
  unreadCount = 0,
  onOpenSensor,
  onNavigate,
  onExitRoverMode,
}: RoverHomeProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
      {/* ── Live readings (stretches to fill leftover height) ── */}
      <section aria-label="Live readings" className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 sm:mb-2.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15">
              <MonitorSmartphone className="h-4 w-4 text-cyan-400" />
            </span>
            Live Readings
          </h2>
          <span className="hidden items-center gap-1 text-xs font-medium text-slate-500 lg:flex">
            Tap a reading to open its chart
          </span>
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5">
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

            return (
              <button
                key={sensor}
                type="button"
                disabled={!chartable}
                onClick={() => chartable && onOpenSensor(sensor)}
                aria-label={
                  chartable ? `Open ${meta.label} chart` : `${meta.label} reading`
                }
                className={`group flex flex-col rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-3 text-left transition-all duration-200 sm:p-4 ${
                  chartable
                    ? "cursor-pointer hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98]"
                    : "cursor-default"
                }`}
              >
                {/* Icon + label + status chip */}
                <div className="flex shrink-0 items-center justify-between gap-1.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon className="h-4.5 w-4.5 shrink-0 sm:h-5 sm:w-5" style={{ color: meta.hexColor }} />
                    <span className="truncate text-[11px] font-semibold text-slate-300 sm:text-xs">
                      {meta.label}
                    </span>
                  </span>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${TONE_TEXT[readout.tone]} ${TONE_CHIP[readout.tone]}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[readout.tone]}`} />
                    {readout.label}
                  </span>
                </div>

                {/* Big value — vertically centered in the tile's free space */}
                <div className="flex flex-1 items-center justify-center gap-1.5 px-0.5">
                  <span className="text-[clamp(1.9rem,7.5vh,3.4rem)] font-extrabold leading-none tracking-tight tabular-nums text-white drop-shadow-sm">
                    {value === null ? "—" : formatSensorValue(sensor, value)}
                  </span>
                  <span className="mt-1.5 text-sm font-semibold text-slate-500 sm:text-base">
                    {meta.unit}
                  </span>
                </div>

                {/* Range bar + caption */}
                <div className="flex shrink-0 flex-col gap-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${TONE_BAR[readout.tone]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">
                    {chartable
                      ? "Tap for chart"
                      : value !== null
                        ? `Ideal ${range.optimalMin}–${range.optimalMax}${meta.unit}`
                        : "Waiting for data"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quick actions (bottom dock) ── */}
      <section aria-label="Quick actions" className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onNavigate(action.id)}
              className="group relative flex min-h-[64px] items-center gap-2.5 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-2.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0f2240] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] sm:min-h-[72px] sm:gap-3 sm:p-3.5"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 sm:h-12 sm:w-12 ${action.iconBg}`}
              >
                <Icon className={`h-5.5 w-5.5 sm:h-6 sm:w-6 ${action.iconColor}`} />
              </span>
              {action.id === "notifications" && unreadCount > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-[#0c1a2e] sm:right-3 sm:top-3">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white sm:text-[15px] lg:text-base">
                  {action.label}
                </span>
                <span className="mt-0.5 hidden truncate text-[11px] font-medium text-slate-500 sm:block">
                  {action.hint}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      {/* ── Back to the normal layout ── */}
      {onExitRoverMode && (
        <button
          type="button"
          onClick={onExitRoverMode}
          className="mx-auto flex shrink-0 items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-cyan-400"
        >
          <MonitorSmartphone className="h-3.5 w-3.5" />
          Turn off rover screen mode
        </button>
      )}
    </div>
  );
}
