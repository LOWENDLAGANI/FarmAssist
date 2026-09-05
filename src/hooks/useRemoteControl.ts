/**
 * useRemoteControl.ts
 * ─────────────────────────────────────────────────────────────────
 * Live listener for the admin's remote page-control command.
 *
 * The admin sets `users/{uid}/remote_control` from the Admin Panel.
 * Every device signed into that account subscribes to this node with
 * an onValue listener — Firebase's persistent socket pushes the change
 * the moment it's written, so devices follow the admin instantly
 * without any polling.
 *
 * Follow rules:
 *   • A command is "pending" if it's newer than the last one this
 *     device has acknowledged (tracked in localStorage per device,
 *     so an iPad that was offline still catches up when it comes
 *     back online, but one that already followed won't re-navigate).
 *   • The admin's own device never follows its own commands.
 *   • "Release" (page = null) just clears the node — nothing follows.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";
import { onValue } from "firebase/database";
import { remoteControlRef } from "@/lib/firebaseConfig";
import { ADMIN_UID } from "@/lib/adminConfig";

export interface RemoteCommand {
  /** Page id to open ("dashboard", "control", …). */
  page: string;
  /** Date.now() when the admin issued it — used to detect "new" commands. */
  issuedAt: number;
  /** Admin UID who issued it. */
  issuedBy?: string;
}

const ACK_KEY = "farmassist-remote-ack";

/** Last acknowledged command timestamp for this browser. */
function getAcknowledgedAt(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(ACK_KEY) ?? 0);
}

function setAcknowledgedAt(ts: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACK_KEY, String(ts));
}

/**
 * @param userId  Firebase Auth UID of the signed-in account (all
 *                devices on the same account share the same command).
 * @param enabled Set false on the admin's own device or the rover
 *                kiosk screen so those don't follow.
 */
export function useRemoteControl(userId: string, enabled: boolean) {
  const [pendingPage, setPendingPage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !enabled) {
      setPendingPage(null);
      return;
    }

    const commandRef = remoteControlRef(userId);
    const unsubscribe = onValue(
      commandRef,
      (snap) => {
        const raw = snap.val() as RemoteCommand | null;
        if (!raw || typeof raw.page !== "string" || !raw.page) {
          setPendingPage(null);
          return;
        }
        // Only follow commands this device hasn't acknowledged yet.
        if (raw.issuedAt <= getAcknowledgedAt()) {
          setPendingPage(null);
          return;
        }
        setPendingPage(raw.page);
      },
      (err) => {
        console.error("[useRemoteControl] Firebase read error:", err);
        setPendingPage(null);
      }
    );

    return () => unsubscribe();
  }, [userId, enabled]);

  /** Acknowledge the current command (marks it handled on this device). */
  const acknowledge = () => {
    setPendingPage((current) => {
      if (current !== null) setAcknowledgedAt(Date.now());
      return null;
    });
  };

  return { pendingPage, acknowledge };
}
