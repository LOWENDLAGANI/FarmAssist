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
    <nav className="flex h-16 items-center justify-around border-t border-cyan-900/30 bg-[#0a1628] px-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              isActive
                ? "text-cyan-400"
                : "text-slate-500 active:text-slate-300"
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
