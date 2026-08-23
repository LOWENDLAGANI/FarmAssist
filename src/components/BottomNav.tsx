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
  Activity,
  Camera,
  Clock,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", id: "dashboard" },
  { icon: Activity, label: "Sensors", id: "sensors" },
  { icon: Camera, label: "Camera", id: "camera" },
  { icon: Clock, label: "History", id: "history" },
  { icon: Settings, label: "Settings", id: "settings" },
];

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
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
            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400 ${
              isActive
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-slate-400 active:bg-slate-800/70 active:text-slate-200"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
