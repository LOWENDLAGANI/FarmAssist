/**
 * useDeviceValidation.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for validating that a Rover (ESP32) is properly linked
 * to the currently logged-in user's account.
 *
 * How it works:
 *  1. When a user pairs a Rover in Settings, a record is written to
 *     `users/{uid}/devices/{deviceId}/link` with a timestamp.
 *  2. This hook listens to both the link record AND the live telemetry
 *     node in real-time.
 *  3. If the link record exists for this user → "linked"
 *  4. If no link record exists AND no telemetry data is present at
 *     the user's path → "mismatch" (device is writing to another
 *     account's path)
 *  5. If no link record exists but telemetry is present (e.g. ESP32
 *     writes without web pairing) → "unregistered"
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { onValue, set, remove, type Unsubscribe } from "firebase/database";
import { deviceLinkRef, telemetryRef } from "@/lib/firebaseConfig";

export type DeviceLinkStatus =
  /** Device is registered and linked to this user. */
  | "linked"
  /** Device is writing data to a different account's path. */
  | "mismatch"
  /** No link record found; telemetry may or may not be present. */
  | "unregistered"
  /** Still loading from RTDB. */
  | "loading";

export interface DeviceLinkInfo {
  /** Unix timestamp (ms) when the device was paired. */
  pairedAt: number;
}

export interface DeviceValidationResult {
  /** Current linkage status. */
  status: DeviceLinkStatus;
  /** Metadata about the device link record, if it exists. */
  linkInfo: DeviceLinkInfo | null;
  /** Whether the initial RTDB reads have completed. */
  isLoading: boolean;
  /** Write the current user as the owner of this device. */
  registerDevice: (userId: string, deviceId: string) => Promise<void>;
  /** Remove the link record so a different account can pair this device. */
  unlinkDevice: (userId: string, deviceId: string) => Promise<void>;
}

/**
 * Validates whether `deviceId` is linked to `userId`.
 *
 * @param userId   The currently logged-in Firebase Auth UID.
 * @param deviceId The Rover ID entered in the dashboard.
 */
export function useDeviceValidation(
  userId: string,
  deviceId: string
): DeviceValidationResult {
  const [status, setStatus] = useState<DeviceLinkStatus>("loading");
  const [linkInfo, setLinkInfo] = useState<DeviceLinkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Track both link record and telemetry presence ────────────
  useEffect(() => {
    if (!userId || !deviceId) {
      setStatus("loading");
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    let linkExists = false;
    let telemetryExists = false;
    let linkLoaded = false;
    let telemetryLoaded = false;

    const resolveStatus = () => {
      if (!linkLoaded || !telemetryLoaded) return;
      setIsLoading(false);

      if (linkExists) {
        setStatus("linked");
      } else if (!telemetryExists) {
        // No link record AND no telemetry at this user's path —
        // the ESP32 is almost certainly writing to another account.
        setStatus("mismatch");
      } else {
        // Telemetry exists but user never paired through the web app.
        setStatus("unregistered");
      }
    };

    let unsubscribeLink: Unsubscribe;
    let unsubscribeTelemetry: Unsubscribe;

    try {
      // ── Listen to link record ──────────────────────────────
      unsubscribeLink = onValue(
        deviceLinkRef(userId, deviceId),
        (snapshot) => {
          const data = snapshot.val();
          if (data && data.pairedAt) {
            linkExists = true;
            setLinkInfo({ pairedAt: data.pairedAt });
          } else {
            linkExists = false;
            setLinkInfo(null);
          }
          linkLoaded = true;
          resolveStatus();
        },
        (err) => {
          console.error("[useDeviceValidation] Link read error:", err);
          linkExists = false;
          linkLoaded = true;
          resolveStatus();
        }
      );

      // ── Listen to telemetry node (read-only check) ─────────
      unsubscribeTelemetry = onValue(
        telemetryRef(userId, deviceId),
        (snapshot) => {
          telemetryExists = snapshot.exists();
          telemetryLoaded = true;
          resolveStatus();
        },
        (err) => {
          console.error("[useDeviceValidation] Telemetry read error:", err);
          telemetryExists = false;
          telemetryLoaded = true;
          resolveStatus();
        }
      );
    } catch (err) {
      console.error("[useDeviceValidation] Failed to attach listeners:", err);
      setStatus("unregistered");
      setIsLoading(false);
    }

    return () => {
      unsubscribeLink?.();
      unsubscribeTelemetry?.();
    };
  }, [userId, deviceId]);

  // ── Register this user as the device owner ───────────────────
  const registerDevice = useCallback(
    async (uid: string, did: string) => {
      if (!uid || !did) return;
      try {
        await set(deviceLinkRef(uid, did), {
          pairedAt: Date.now(),
        });
      } catch (err) {
        console.error("[useDeviceValidation] Failed to register device:", err);
      }
    },
    []
  );

  // ── Unlink this device (remove the link record) ──────────────
  const unlinkDevice = useCallback(
    async (uid: string, did: string) => {
      if (!uid || !did) return;
      try {
        await remove(deviceLinkRef(uid, did));
      } catch (err) {
        console.error("[useDeviceValidation] Failed to unlink device:", err);
      }
    },
    []
  );

  return {
    status,
    linkInfo,
    isLoading,
    registerDevice,
    unlinkDevice,
  };
}
