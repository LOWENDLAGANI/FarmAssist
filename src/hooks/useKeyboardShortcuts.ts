/**
 * useKeyboardShortcuts.ts
 * ─────────────────────────────────────────────────────────────────
 * Registers keyboard shortcuts for desktop power users.
 *
 * Shortcuts:
 *   1-4      → Switch sensor (temp, moisture, water, light)
 *   d        → Go to Dashboard
 *   c        → Go to Control
 *   n        → Go to Notifications
 *   h        → Go to History
 *   a        → Go to Achievements
 *   s        → Go to Settings
 *   / or ?   → Open assistant chat
 *   Esc      → Close modals / go back to dashboard
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useCallback } from "react";
import type { SensorKey } from "@/types/telemetry";

const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

interface UseKeyboardShortcutsOptions {
  onNavigate: (page: string) => void;
  onSelectSensor: (key: SensorKey) => void;
  onOpenAssistant?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigate,
  onSelectSensor,
  onOpenAssistant,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Don't fire with modifier keys (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        // Sensor switching
        case "1":
          e.preventDefault();
          onSelectSensor(SENSOR_KEYS[0]);
          break;
        case "2":
          e.preventDefault();
          onSelectSensor(SENSOR_KEYS[1]);
          break;
        case "3":
          e.preventDefault();
          onSelectSensor(SENSOR_KEYS[2]);
          break;
        case "4":
          e.preventDefault();
          onSelectSensor(SENSOR_KEYS[3]);
          break;

        // Page navigation
        case "d":
          onNavigate("dashboard");
          break;
        case "c":
          onNavigate("control");
          break;
        case "n":
          onNavigate("notifications");
          break;
        case "h":
          onNavigate("history");
          break;
        case "s":
          onNavigate("settings");
          break;
        case "b":
          onNavigate("account");
          break;

        // Open assistant
        case "/":
          e.preventDefault();
          onOpenAssistant?.();
          break;
        case "?":
          e.preventDefault();
          onOpenAssistant?.();
          break;

        // Escape → back to dashboard
        case "Escape":
          onNavigate("dashboard");
          break;
      }
    },
    [onNavigate, onSelectSensor, onOpenAssistant]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler, enabled]);
}
