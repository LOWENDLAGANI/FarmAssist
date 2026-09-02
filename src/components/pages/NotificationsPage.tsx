/**
 * NotificationsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full-page view for the notification center.
 * Shows all critical alerts (sensor thresholds, rover offline)
 * with filtering and mark-as-read controls.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  AlertTriangle,
  WifiOff,
  CheckCheck,
  Filter,
} from "lucide-react";
import type { AppNotification } from "@/types/notifications";
import { formatLastSeen } from "@/lib/formatLastSeen";

interface NotificationsPageProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

type FilterType = "all" | "unread" | "sensor_alert" | "rover_offline";

function notificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "sensor_alert":
      return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    case "rover_offline":
      return <WifiOff className="h-5 w-5 text-red-400" />;
  }
}

function notificationLabel(type: AppNotification["type"]) {
  switch (type) {
    case "sensor_alert":
      return "Sensor Alert";
    case "rover_offline":
      return "Rover Offline";
  }
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "sensor_alert", label: "Sensor Alerts" },
  { value: "rover_offline", label: "Rover Offline" },
];

export default function NotificationsPage({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPageProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "all") return true;
    return n.type === filter;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Notifications</h2>
          <p className="text-sm text-slate-400">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-2 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2.5 text-sm text-cyan-400 transition-colors hover:bg-[#0f2240] hover:text-white"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === opt.value
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-[#0a1628] text-slate-500 hover:text-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] py-16">
          <BellOff className="mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">No notifications</p>
          <p className="text-xs text-slate-600">
            {filter === "all"
              ? "Critical alerts will appear here"
              : "No notifications match this filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => (
            <button
              key={notif.id}
              onClick={() => {
                if (!notif.read) onMarkRead(notif.id);
              }}
              className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors ${
                !notif.read
                  ? "border-cyan-500/20 bg-[#0c1a2e] hover:border-cyan-500/40"
                  : "border-cyan-900/10 bg-[#0c1a2e]/60 hover:bg-[#0c1a2e]"
              }`}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {notificationIcon(notif.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${!notif.read ? "text-white" : "text-slate-300"}`}>
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {notif.body}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-md bg-[#0a1628] px-2 py-0.5 text-[10px] text-slate-500">
                    {notificationLabel(notif.type)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {notif.deviceId}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {notif.createdAt > 0 ? formatLastSeen(notif.createdAt) : ""}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
