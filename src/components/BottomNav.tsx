/**
 * BottomNav.tsx
 * ─────────────────────────────────────────────────────────────────
 * Bottom tab bar for mobile layout.
 * Replaces the sidebar on small screens.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import {
  LayoutDashboard,
  Bell,
  Clock,
  Settings,
  SlidersHorizontal,
  CircleUserRound,
  Trophy,
  Info,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", id: "dashboard" },
  { icon: SlidersHorizontal, label: "Control", id: "control" },
  { icon: Bell, label: "Alerts", id: "notifications" },
  { icon: Clock, label: "History", id: "history" },
  { icon: Trophy, label: "Awards", id: "achievements" },
  { icon: CircleUserRound, label: "Account", id: "account" },
  { icon: Settings, label: "Settings", id: "settings" },
  { icon: Info, label: "About", id: "about" },
];

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Show a pulsing alert dot on the Settings icon. */
  settingsAlert?: boolean;
}

export default function BottomNav({ activePage, onNavigate, settingsAlert }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] items-start justify-around border-t border-cyan-900/30 bg-[#0a1628]/95 px-1 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400 hover:scale-105 active:scale-95 ${
              isActive
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-slate-400 active:bg-slate-800/70 active:text-slate-200"
            }`}
          >
            <span className="relative">
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
              {item.id === "settings" && settingsAlert && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse-dot" />
              )}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
