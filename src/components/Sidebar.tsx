/**
 * Sidebar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Vertical navigation sidebar (desktop ≥768px).
 *
 * Layout (matches the Agrovator @ Sekolah reference UI):
 *  • Top: picture banner (or default logo + wordmark fallback)
 *  • Below: labeled nav items with rounded active pill highlight
 *  • Bottom: collapse/expand toggle
 *
 * 🖼️ BANNER SETUP:
 * Drop your own picture banner at:   public/sidebar-banner.png
 * It fills the whole top area of the sidebar. If missing,
 * the app falls back to the small logo + wordmark instead.
 *
 * 🖼️ BACKGROUND SETUP:
 * Drop your own background picture at:   public/sidebar-bg.jpg
 * It fills the whole sidebar behind the menu. If missing,
 * the plain dark-green background (#0f2417) is used instead.
 * A soft dark tint is applied over it so menu text stays readable.
 *
 * Mobile uses BottomNav.tsx instead — this component is desktop-only.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Bell,
  Clock,
  Settings,
  Leaf,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: SlidersHorizontal, label: "Control", id: "control" },
  { icon: Bell, label: "Notifications", id: "notifications" },
  { icon: Clock, label: "History", id: "history" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const COLLAPSED_KEY = "agrovator-sidebar-collapsed";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Show a pulsing alert dot on the Settings item. */
  settingsAlert?: boolean;
  /** Notifies the parent whenever the collapsed state changes (including restored-on-load). */
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ activePage, onNavigate, settingsAlert, onCollapsedChange }: SidebarProps) {
  // Start expanded; restore the saved preference after mount (avoids hydration mismatch)
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_KEY) === "1") {
        setCollapsed(true);
        onCollapsedChange?.(true);
      }
    } catch {
      /* storage unavailable — stay expanded */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    onCollapsedChange?.(next);
  };

  return (
    <aside
      className={`relative hidden h-full shrink-0 flex-col overflow-y-auto border-r border-emerald-900/30 bg-[#0f2417] transition-[width] duration-200 ease-in-out md:flex ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ── Custom background picture ── */}
      {/* Put YOUR picture at public/sidebar-bg.jpg to see it here */}
      <img
        src="/sidebar-bg.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          // No background picture found → hide it and keep the plain color
          const img = e.currentTarget;
          if (img.dataset.fallback) return;
          img.dataset.fallback = "1";
          img.style.display = "none";
        }}
        onLoad={(e) => {
          // Background picture loaded → reveal the readability tint over it
          e.currentTarget.nextElementSibling?.removeAttribute("style");
        }}
      />
      {/* Dark tint over the background picture so menu text stays readable */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f2417]/60 via-[#0f2417]/75 to-[#0f2417]/90"
        style={{ display: "none" }}
      />
      {/* ── Top branding ── */}
      {/* Put YOUR picture at public/sidebar-banner.png to see it here */}
      <div className="relative border-b border-emerald-900/30">
        {collapsed ? (
          /* Compact rail: just the banner picture as a small square */
          <div className="flex justify-center py-3">
            <img
              src="/sidebar-banner.png"
              alt="Agrovator banner"
              className="h-9 w-9 cursor-pointer rounded-xl object-cover"
              onClick={() => onNavigate("dashboard")}
              onError={(e) => {
                // No banner picture found → hide it and show default logo
                const img = e.currentTarget;
                if (img.dataset.fallback) return;
                img.dataset.fallback = "1";
                img.style.display = "none";
                img.nextElementSibling?.removeAttribute("style");
              }}
            />
            <div
              className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400"
              style={{ display: "none" }}
            >
              <Leaf className="h-5 w-5" />
            </div>
          </div>
        ) : (
          <>
            {/* Your custom picture banner — shown when the file exists */}
            <img
              src="/sidebar-banner.png"
              alt="Agrovator banner"
              className="h-24 w-full cursor-pointer object-cover"
              onClick={() => onNavigate("dashboard")}
              onError={(e) => {
                // No banner picture found → hide it and show default branding
                const img = e.currentTarget;
                if (img.dataset.fallback) return;
                img.dataset.fallback = "1";
                img.style.display = "none";
                img.nextElementSibling?.removeAttribute("style");
              }}
            />

            {/* Default branding — used only while public/sidebar-banner.png is missing */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ display: "none" }}>
              {/* Small logo image — falls back to a leaf icon until the file exists */}
              <img
                src="/agrovator-logo.png"
                alt="Agrovator logo"
                className="h-11 w-11 rounded-xl object-contain"
                onError={(e) => {
                  // Swap to icon fallback if the image file is missing
                  const img = e.currentTarget;
                  if (img.dataset.fallback) return;
                  img.dataset.fallback = "1";
                  img.style.display = "none";
                  img.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Leaf className="h-6 w-6" />
              </div>

              {/* Wordmark */}
              <div className="flex flex-col">
                <span className="text-xl font-extrabold leading-none tracking-tight text-emerald-400">
                  agr<span className="text-white">o</span>vator
                </span>
                <span className="mt-1 w-fit rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  @sekolah
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Nav Items ── */}
      <nav className={`relative flex flex-1 flex-col gap-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center rounded-xl text-left text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
              } ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400 hover:bg-emerald-500/10 hover:text-slate-200"
              }`}
            >
              <Icon
                className={`${collapsed ? "h-6 w-6" : "h-5 w-5"} shrink-0 transition-transform duration-200 group-hover:scale-110`}
              />
              {!collapsed && <span>{item.label}</span>}
              {item.id === "settings" && settingsAlert && (
                <span
                  className={`rounded-full bg-amber-400 animate-pulse-dot ${
                    collapsed ? "absolute right-2 top-2 h-2.5 w-2.5" : "ml-auto h-2 w-2"
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Collapse / expand toggle ── */}
      <div className={`relative border-t border-emerald-900/30 p-2 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition-colors duration-200 hover:bg-emerald-500/10 hover:text-slate-200"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
