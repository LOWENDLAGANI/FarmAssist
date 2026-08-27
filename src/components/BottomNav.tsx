/**
 * BottomNav.tsx
 * ─────────────────────────────────────────────────────────────────
 * Bottom tab bar for mobile layout.
 * Replaces the sidebar on small screens.
 *
 * Uses 5 primary tabs + a "More" overflow menu for secondary pages
 * (Achievements, Account, About) to avoid crowding the bar.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Bell,
  Clock,
  Settings,
  SlidersHorizontal,
  Trophy,
  CircleUserRound,
  Info,
  MoreHorizontal,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  id: string;
}

/** Primary tabs shown directly on the bar. */
const PRIMARY_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", id: "dashboard" },
  { icon: SlidersHorizontal, label: "Control", id: "control" },
  { icon: Bell, label: "Alerts", id: "notifications" },
  { icon: Clock, label: "History", id: "history" },
];

/** Secondary pages shown inside the "More" menu. */
const MORE_ITEMS: NavItem[] = [
  { icon: Trophy, label: "Achievements", id: "achievements" },
  { icon: CircleUserRound, label: "Account", id: "account" },
  { icon: Settings, label: "Settings", id: "settings" },
  { icon: Info, label: "About", id: "about" },
];

/** All nav item IDs for active-state detection. */
const ALL_IDS = new Set([
  ...PRIMARY_ITEMS.map((i) => i.id),
  ...MORE_ITEMS.map((i) => i.id),
]);

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Show a pulsing alert dot on the Settings icon. */
  settingsAlert?: boolean;
}

export default function BottomNav({
  activePage,
  onNavigate,
  settingsAlert,
}: BottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNavigate = useCallback(
    (id: string) => {
      onNavigate(id);
      setMenuOpen(false);
    },
    [onNavigate]
  );

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const isMoreActive = MORE_ITEMS.some((item) => item.id === activePage);

  return (
    <>
      {/* ── Backdrop ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden" />
      )}

      {/* ── Overflow menu panel ── */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-x-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 overflow-hidden rounded-2xl border border-cyan-900/30 bg-[#0c1a2e]/98 shadow-2xl shadow-black/50 backdrop-blur-xl md:hidden animate-slide-up"
        >
          {MORE_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex w-full items-center gap-3 px-5 py-3.5 transition-colors ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-slate-300 active:bg-white/5"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.id === "settings" && settingsAlert && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse-dot" />
                  )}
                </span>
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Bottom bar ── */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] items-start justify-around border-t border-cyan-900/30 bg-[#0a1628]/95 px-1 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {PRIMARY_ITEMS.map((item) => {
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
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* ── More button ── */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="More pages"
          className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400 hover:scale-105 active:scale-95 ${
            isMoreActive
              ? "bg-cyan-500/10 text-cyan-400"
              : "text-slate-400 active:bg-slate-800/70 active:text-slate-200"
          }`}
        >
          <MoreHorizontal className={`h-5 w-5 transition-transform duration-200 ${menuOpen ? "rotate-90" : ""}`} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
