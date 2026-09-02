/**
 * NotificationCenter.tsx
 * ─────────────────────────────────────────────────────────────────
 * Bell icon with unread badge + dropdown panel listing notifications.
 * Only critical alerts appear here (sensor thresholds, rover offline).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  BellOff,
  AlertTriangle,
  WifiOff,
  CheckCheck,
  X,
} from "lucide-react";
import type { AppNotification } from "@/types/notifications";
import { formatLastSeen } from "@/lib/formatLastSeen";

interface NotificationCenterProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function notificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "sensor_alert":
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case "rover_offline":
      return <WifiOff className="h-4 w-4 text-red-400" />;
  }
}

export default function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-hidden rounded-2xl border border-cyan-900/30 bg-[#0c1a2e] shadow-2xl shadow-black/50 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-900/20 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-cyan-400 transition-colors hover:bg-cyan-500/10"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-500 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BellOff className="mb-2 h-8 w-8 text-slate-600" />
                <p className="text-xs text-slate-500">
                  No notifications yet
                </p>
                <p className="text-[10px] text-slate-600">
                  Critical alerts will appear here
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) onMarkRead(notif.id);
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#0f2240] ${
                    !notif.read
                      ? "border-l-2 border-l-cyan-400 bg-[#0a1628]"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {notificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-slate-600">
                        {notif.deviceId}
                      </span>
                      <span className="text-[9px] text-slate-600">
                        {notif.createdAt > 0
                          ? formatLastSeen(notif.createdAt)
                          : ""}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
