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
import { getToken, onMessage, type Messaging, type MessagePayload } from "firebase/messaging";
import { set } from "firebase/database";
import { messaging, fcmTokenRef } from "@/lib/firebaseConfig";

/** FCM service worker URL + scope (must match public/firebase-messaging-sw.js). */
const SW_URL = "/firebase-messaging-sw.js";
const SW_SCOPE = "/";
const ACTIVATION_TIMEOUT_MS = 15_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns a live SW registration for the FCM worker that definitely has an
 * active worker — registering it first if none exists yet. Throws if the
 * browser has no Service Worker support or activation times out.
 */
async function ensureActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }

  let registration =
    (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ??
    (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }));

  // register() resolves as soon as the worker script is installed —
  // activation may still be in flight, and pushManager.subscribe() needs
  // an ACTIVE worker. Wait for activation, then re-fetch the live
  // registration so getToken() never receives a stale object whose
  // .active is still null.
  if (!registration.active) {
    const activationTimeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker activation timed out")),
        ACTIVATION_TIMEOUT_MS
      )
    );
    await Promise.race([navigator.serviceWorker.ready, activationTimeout]);
    registration =
      (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ?? registration;
  }

  if (!registration.active) {
    throw new Error("Service worker has no active worker");
  }
  return registration;
}

/**
 * Fetches an FCM token, retrying with backoff when Chrome throws the
 * intermittent "Subscription failed - no active Service Worker" AbortError —
 * a known race where subscribe() fires in the same tick the worker finishes
 * activating. Non-race failures bubble up immediately.
 */
async function fetchFcmTokenWithRetry(
  messagingInstance: Messaging,
  vapidKey: string
): Promise<string | null> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const swRegistration = await ensureActiveServiceWorker();
      const token = await getToken(messagingInstance, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });
      return token ?? null;
    } catch (err) {
      const activationRace =
        err instanceof DOMException && err.name === "AbortError";
      if (!activationRace || attempt === MAX_ATTEMPTS) throw err;
      console.warn(
        `[useFCM] Push subscribe raced service worker activation; retrying (${attempt}/${MAX_ATTEMPTS})...`
      );
      await wait(attempt * 1000);
    }
  }
  return null;
}

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

          // Firebase getToken() requires an ACTIVE service worker to
          // subscribe to push — fetch the token with an activation-safe
          // registration and retry on Chrome's known activation race.
          console.log("[useFCM] Fetching FCM token...");
          const fcmToken = await fetchFcmTokenWithRetry(messaging, vapidKey);
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
