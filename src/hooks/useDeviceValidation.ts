/**
 * useDeviceValidation.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for validating exclusive Rover (ESP32) ownership.
 *
 * Uses a shared `rover_registry/{deviceId}` node that every
 * authenticated user can read, but only the current owner (or
 * a first-time pairer) can write to. This prevents two accounts
 * from pairing the same Rover simultaneously.
 *
 * Flow:
 *  1. On mount, listen to `rover_registry/{deviceId}`.
 *  2. If `paired === true && ownerUid === me` → "linked"
 *  3. If `paired === true && ownerUid !== me` → "taken"
 *  4. If record absent or `paired === false` → "unregistered"
 *  5. Pairing writes `{ ownerUid, paired: true, pairedAt }` —
 *     only succeeds if the Rover is unregistered or already mine.
 *  6. Force-pairing overwrites the record to claim a taken Rover.
 *  7. Unlinking sets `paired: false` but keeps the record so the
 *     original owner can re-pair without conflict.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { onValue, set, get, type Unsubscribe } from "firebase/database";
import { roverRegistryRef } from "@/lib/firebaseConfig";

export type DeviceLinkStatus =
  /** Rover is paired to this user's account. */
  | "linked"
  /** Rover is paired to a *different* account. */
  | "taken"
  /** Rover is unpaired / record doesn't exist. */
  | "unregistered"
  /** Still loading from RTDB. */
  | "loading";

export interface RoverRegistryInfo {
  /** The UID that currently owns this Rover. */
  ownerUid: string;
  /** Whether the Rover is actively paired. */
  paired: boolean;
  /** Unix timestamp (ms) when the Rover was paired. */
  pairedAt: number;
  /** Unix timestamp (ms) of the last heartbeat from the ESP32. */
  lastSeen: number | null;
  /** Firmware version string reported by the ESP32. */
  firmwareVersion: string | null;
}

export interface DeviceValidationResult {
  /** Current ownership status. */
  status: DeviceLinkStatus;
  /** Full registry record, if it exists. */
  registryInfo: RoverRegistryInfo | null;
  /** Whether the initial RTDB reads have completed. */
  isLoading: boolean;
  /** Pair this Rover to the given user. Fails if already taken by another. */
  registerDevice: (userId: string, deviceId: string) => Promise<boolean>;
  /** Force-pair a Rover already owned by another user. */
  forceRegisterDevice: (userId: string, deviceId: string) => Promise<void>;
  /** Unlink the Rover so it can be paired by any account. */
  unlinkDevice: (userId: string, deviceId: string) => Promise<void>;
}

/**
 * Validates whether `deviceId` is exclusively paired to `userId`.
 *
 * @param userId   The currently logged-in Firebase Auth UID.
 * @param deviceId The Rover ID entered in the dashboard.
 */
/** Check if the user is a guest (demo mode) */
function isGuestUser(userId: string): boolean {
  return userId.startsWith("guest-");
}

export function useDeviceValidation(
  userId: string,
  deviceId: string
): DeviceValidationResult {
  const [status, setStatus] = useState<DeviceLinkStatus>("loading");
  const [registryInfo, setRegistryInfo] = useState<RoverRegistryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Skip Firebase for guest users ──────────────────────────
  if (isGuestUser(userId)) {
    return {
      status: "linked",
      registryInfo: {
        ownerUid: userId,
        paired: true,
        pairedAt: Date.now(),
        lastSeen: Date.now(),
        firmwareVersion: "v1.0.0-demo",
      },
      isLoading: false,
      registerDevice: async () => true,
      forceRegisterDevice: async () => {},
      unlinkDevice: async () => {},
    };
  }

  // ── Listen to rover_registry/{deviceId} ─────────────────────
  useEffect(() => {
    if (!userId || !deviceId) {
      setStatus("loading");
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    let unsubscribe: Unsubscribe;

    try {
      unsubscribe = onValue(
        roverRegistryRef(deviceId),
        (snapshot) => {
          const data = snapshot.val();

          if (!data) {
            setStatus("unregistered");
            setRegistryInfo(null);
            setIsLoading(false);
            return;
          }

          const info: RoverRegistryInfo = {
            ownerUid: data.ownerUid ?? "",
            paired: data.paired === true,
            pairedAt: data.pairedAt ?? 0,
            lastSeen: typeof data.lastSeen === "number" ? data.lastSeen : null,
            firmwareVersion: typeof data.firmwareVersion === "string" ? data.firmwareVersion : null,
          };
          setRegistryInfo(info);

          if (info.paired && info.ownerUid === userId) {
            setStatus("linked");
          } else if (info.paired && info.ownerUid !== userId) {
            setStatus("taken");
          } else {
            setStatus("unregistered");
          }

          setIsLoading(false);
        },
        (err) => {
          console.error("[useDeviceValidation] Registry read error:", err);
          setStatus("unregistered");
          setRegistryInfo(null);
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("[useDeviceValidation] Failed to attach listener:", err);
      setStatus("unregistered");
      setIsLoading(false);
    }

    return () => {
      unsubscribe?.();
    };
  }, [userId, deviceId]);

  // ── Pair (only if unregistered or already mine) ─────────────
  const registerDevice = useCallback(
    async (uid: string, did: string): Promise<boolean> => {
      if (!uid || !did) return false;
      try {
        const snap = await get(roverRegistryRef(did));
        const existing = snap.val();

        // Block if already paired to a different user
        if (existing?.paired && existing.ownerUid !== uid) {
          return false;
        }

        await set(roverRegistryRef(did), {
          ownerUid: uid,
          paired: true,
          pairedAt: Date.now(),
        });
        return true;
      } catch (err) {
        console.error("[useDeviceValidation] Failed to register device:", err);
        return false;
      }
    },
    []
  );

  // ── Force-pair (overwrite another user's ownership) ─────────
  const forceRegisterDevice = useCallback(
    async (uid: string, did: string) => {
      if (!uid || !did) return;
      try {
        await set(roverRegistryRef(did), {
          ownerUid: uid,
          paired: true,
          pairedAt: Date.now(),
        });
      } catch (err) {
        console.error("[useDeviceValidation] Failed to force-register device:", err);
      }
    },
    []
  );

  // ── Unlink (set paired=false, keep record) ──────────────────
  const unlinkDevice = useCallback(
    async (uid: string, did: string) => {
      if (!uid || !did) return;
      try {
        await set(roverRegistryRef(did), {
          ownerUid: uid,
          paired: false,
          pairedAt: 0,
        });
      } catch (err) {
        console.error("[useDeviceValidation] Failed to unlink device:", err);
      }
    },
    []
  );

  return {
    status,
    registryInfo,
    isLoading,
    registerDevice,
    forceRegisterDevice,
    unlinkDevice,
  };
}
