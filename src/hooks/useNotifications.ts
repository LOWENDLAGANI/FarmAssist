/**
 * useNotifications.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for the in-app notification center.
 *
 * Responsibilities:
 *  • Listens to users/{uid}/notifications in real-time
 *  • Provides unread count for the bell badge
 *  • Exposes helpers to create new notifications and mark them read
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { onValue, push, set, update, get, remove, type Unsubscribe } from "firebase/database";
import { notificationsRef, db } from "@/lib/firebaseConfig";
import type {
  AppNotification,
  NotificationType,
} from "@/types/notifications";

const MAX_NOTIFICATIONS = 50;

export interface NotificationsResult {
  /** All notifications, newest first. */
  notifications: AppNotification[];
  /** Number of unread notifications. */
  unreadCount: number;
  /** Whether the initial load is complete. */
  isLoading: boolean;
  /** Create a new notification. */
  createNotification: (
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    deviceId: string
  ) => Promise<void>;
  /** Mark a single notification as read. */
  markRead: (userId: string, notificationId: string) => Promise<void>;
  /** Mark all notifications as read. */
  markAllRead: (userId: string) => Promise<void>;
}

/** Check if the user is a guest (demo mode) */
function isGuestUser(userId: string): boolean {
  return userId.startsWith("guest-");
}

export function useNotifications(userId: string): NotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ── Skip Firebase for guest users ──────────────────────────
  if (isGuestUser(userId)) {
    return {
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      createNotification: async () => {},
      markRead: async () => {},
      markAllRead: async () => {},
    };
  }

  // ── Listen to notifications ────────────────────────────────
  useEffect(() => {
    if (!userId || isGuestUser(userId)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribe: Unsubscribe;

    try {
      unsubscribe = onValue(
        notificationsRef(userId),
        (snapshot) => {
          const items: AppNotification[] = [];
          let unread = 0;

          snapshot.forEach((child) => {
            const val = child.val();
            if (!val) return;
            const notif: AppNotification = {
              id: child.key!,
              type: val.type ?? "sensor_alert",
              title: val.title ?? "",
              body: val.body ?? "",
              deviceId: val.deviceId ?? "",
              createdAt: val.createdAt ?? 0,
              read: val.read === true,
            };
            items.push(notif);
            if (!notif.read) unread++;
          });

          // Newest first
          items.sort((a, b) => b.createdAt - a.createdAt);
          setNotifications(items);
          setUnreadCount(unread);
          setIsLoading(false);
        },
        (err) => {
          console.error("[useNotifications] RTDB error:", err);
          setNotifications([]);
          setUnreadCount(0);
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("[useNotifications] Failed to attach listener:", err);
      setIsLoading(false);
    }

    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  // ── Create a notification ──────────────────────────────────
  const createNotification = useCallback(
    async (
      uid: string,
      type: NotificationType,
      title: string,
      body: string,
      deviceId: string
    ) => {
      if (!uid) return;
      try {
        await push(notificationsRef(uid), {
          type,
          title,
          body,
          deviceId,
          createdAt: Date.now(),
          read: false,
        });

        // Prune old notifications beyond limit
        const snap = await get(notificationsRef(uid));
        const keys: string[] = [];
        snap.forEach((child) => {
          keys.push(child.key!);
        });
        if (keys.length > MAX_NOTIFICATIONS) {
          const excess = keys.length - MAX_NOTIFICATIONS;
          const toDelete = keys.slice(0, excess);
          for (const k of toDelete) {
            const { ref: fbRef } = await import("firebase/database");
            await remove(fbRef(db, `users/${uid}/notifications/${k}`));
          }
        }
      } catch (err) {
        console.error("[useNotifications] Failed to create notification:", err);
      }
    },
    []
  );

  // ── Mark single notification as read ───────────────────────
  const markRead = useCallback(
    async (uid: string, notificationId: string) => {
      if (!uid || !notificationId) return;
      try {
        const { ref: fbRef } = await import("firebase/database");
        await update(
          fbRef(db, `users/${uid}/notifications/${notificationId}`),
          { read: true }
        );
      } catch (err) {
        console.error("[useNotifications] Failed to mark read:", err);
      }
    },
    []
  );

  // ── Mark all notifications as read ─────────────────────────
  const markAllRead = useCallback(
    async (uid: string) => {
      if (!uid) return;
      try {
        const { ref: fbRef } = await import("firebase/database");
        const updates: Record<string, boolean> = {};
        for (const n of notifications) {
          if (!n.read) {
            updates[`users/${uid}/notifications/${n.id}/read`] = true;
          }
        }
        if (Object.keys(updates).length > 0) {
          await update(fbRef(db), updates);
        }
      } catch (err) {
        console.error("[useNotifications] Failed to mark all read:", err);
      }
    },
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    createNotification,
    markRead,
    markAllRead,
  };
}
