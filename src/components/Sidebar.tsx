/**
 * Sidebar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Vertical navigation sidebar with icon-only design.
 * Dark navy theme matching the Farm Assistant reference UI.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import {
  LayoutDashboard,
  Activity,
  Camera,
  Clock,
  Settings,
  Leaf,
  type LucideIcon,
} from "lucide-react";


interface NavItem {
  icon: LucideIcon;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Activity, label: "Sensors", id: "sensors" },
  { icon: Camera, label: "Camera", id: "camera" },
  { icon: Clock, label: "History", id: "history" },
  { icon: Settings, label: "Settings", id: "settings" },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Show a pulsing alert dot on the Settings icon. */
  settingsAlert?: boolean;
}

export default function Sidebar({ activePage, onNavigate, settingsAlert }: SidebarProps) {
  return (
    <aside className="hidden h-full w-16 shrink-0 flex-col items-center border-r border-cyan-900/30 bg-[#0a1628] py-4 md:flex md:w-20">
      {/* ── Logo ── */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
        <Leaf className="h-5 w-5" />
      </div>

      {/* ── Nav Items ── */}
      <nav className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
              }`}
            >
              {isActive && (
                <div className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400" />
              )}
              <Icon className="h-5 w-5" />
              {item.id === "settings" && settingsAlert && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse-dot" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
