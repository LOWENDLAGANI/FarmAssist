/**
 * QuickActionFAB.tsx
 * ─────────────────────────────────────────────────────────────────
 * Floating action button (FAB) for mobile screens.
 * Provides quick access to the most common action:
 *   • Start Watering (primary)
 *
 * Long-press reveals a radial menu with additional actions.
 * Sits above the BottomNav on small screens.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";
import { Droplets, X, Sprout, AlertTriangle } from "lucide-react";

interface QuickActionFABProps {
  onNavigateToControl: () => void;
  onEmergencyStop?: () => void;
}

export default function QuickActionFAB({
  onNavigateToControl,
}: QuickActionFABProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const collapse = useCallback(() => setExpanded(false), []);

  return (
    <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3 md:hidden">
      {/* Expanded menu items */}
      {expanded && (
        <>
          {/* Emergency Stop */}
          <button
            type="button"
            onClick={() => {
              collapse();
              onNavigateToControl();
            }}
            className="flex h-12 items-center gap-2 rounded-full border border-red-500/30 bg-red-950/90 px-4 text-xs font-medium text-red-300 shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
          >
            <AlertTriangle className="h-4 w-4" />
            Emergency
          </button>

          {/* Quick Watering */}
          <button
            type="button"
            onClick={() => {
              collapse();
              onNavigateToControl();
            }}
            className="flex h-12 items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/90 px-4 text-xs font-medium text-blue-300 shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
          >
            <Droplets className="h-4 w-4" />
            Watering
          </button>

          {/* Fertilizer */}
          <button
            type="button"
            onClick={() => {
              collapse();
              onNavigateToControl();
            }}
            className="flex h-12 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/90 px-4 text-xs font-medium text-emerald-300 shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
          >
            <Sprout className="h-4 w-4" />
            Fertilizer
          </button>

          {/* Backdrop */}
          <button
            type="button"
            onClick={collapse}
            className="fixed inset-0 -z-10 bg-black/30 backdrop-blur-[2px]"
            aria-hidden="true"
          />
        </>
      )}

      {/* Main FAB */}
      <button
        type="button"
        onClick={toggle}
        aria-label={expanded ? "Close quick actions" : "Quick actions"}
        aria-expanded={expanded}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 ${
          expanded
            ? "bg-slate-700 rotate-45"
            : "bg-gradient-to-br from-blue-500 to-cyan-500"
        }`}
      >
        {expanded ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Droplets className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}
