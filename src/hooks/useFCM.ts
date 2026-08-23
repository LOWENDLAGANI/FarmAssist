/**
 * useFCM.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for Firebase Cloud Messaging (FCM) web push.
 *
 * Responsibilities:
 *  • Requests notification permission from the browser
 *  • Retrieves the FCM registration token
 *  • Stores the token at users/{uid}/fcmToken in RTDB so Cloud
 *    Functions can send targeted pushes
 *  • Listens for foreground messages and fires a browser notification
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { set } from "firebase/database";
import { messaging, fcmTokenRef } from "@/lib/firebaseConfig";

export interface FCMState {
  /** Whether FCM is supported and permission was granted. */
  isSupported: boolean;
  /** Current permission state: "granted" | "denied" | "default". */
  permission: NotificationPermission;
  /** The FCM registration token, if obtained. */
  token: string | null;
  /** Whether the token is being fetched. */
  isLoading: boolean;
  /** The last foreground message received (for in-app toast, etc). */
  lastMessage: MessagePayload | null;
  /** Request notification permission and get token. */
  requestPermission: (userId: string) => Promise<void>;
}

export function useFCM(userId: string): FCMState {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermissionState] =
    useState<NotificationPermission>("default");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] =
    useState<MessagePayload | null>(null);

  // ── Check support on mount ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "Notification" in window && !!messaging;
    setIsSupported(supported);
    if (supported) {
      setPermissionState(Notification.permission);
    }
  }, []);

  // ── Listen for foreground messages ─────────────────────────
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      setLastMessage(payload);

      // Show a browser notification even when the tab is focused
      if (Notification.permission === "granted") {
        const { title, body } = payload.notification ?? {};
        if (title) {
          new Notification(title, {
            body: body ?? "",
            icon: "/favicon.ico",
            tag: payload.data?.deviceId as string | undefined,
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Request permission and store token ─────────────────────
  const requestPermission = useCallback(
    async (uid: string) => {
      if (!uid || !messaging) return;
      setIsLoading(true);

      try {
        console.log("[useFCM] Requesting notification permission...");
        const result = await Notification.requestPermission();
        console.log("[useFCM] Permission result:", result);
        setPermissionState(result);

        if (result === "granted") {
          const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
          console.log("[useFCM] VAPID key present:", !!vapidKey);
          console.log("[useFCM] Messaging instance:", !!messaging);

          if (!vapidKey) {
            console.error("[useFCM] NEXT_PUBLIC_FCM_VAPID_KEY is not set!");
            return;
          }

          const fcmToken = await getToken(messaging, { vapidKey });
          console.log("[useFCM] FCM token obtained:", !!fcmToken);

          if (fcmToken) {
            setToken(fcmToken);
            // Store token in RTDB so Cloud Functions can target this user
            await set(fcmTokenRef(uid), {
              token: fcmToken,
              createdAt: Date.now(),
              userAgent: navigator.userAgent.slice(0, 200),
            });
            console.log("[useFCM] Token stored in RTDB for user:", uid);
          }
        }
      } catch (err) {
        console.error("[useFCM] Failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isSupported,
    permission,
    token,
    isLoading,
    lastMessage,
    requestPermission,
  };
}
