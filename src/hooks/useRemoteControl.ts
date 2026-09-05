/**
 * useRemoteControl.ts
 * ─────────────────────────────────────────────────────────────────
 * Live listener for the admin's remote page-control command.
 *
 * The admin sets `users/{uid}/remote_control` from the Admin Panel.
 * Every device signed into that account subscribes with an onValue
 * listener — Firebase's persistent socket pushes the change the
 * moment it's written, so devices follow instantly without polling.
 *
 * A command is "pending" if its issuedAt is newer than the last one
 * this device acknowledged (stored per browser), so devices that were
 * offline catch up when they reconnect. The ack stores the command's
 * own issuedAt (not the local clock), so clock skew can never
 * suppress a command.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { onValue } from "firebase/database";
import { remoteControlRef } from "@/lib/firebaseConfig";

export interface RemoteCommand {
  /** Page id to open ("dashboard", "control", …). */
  page: string;
  /** Date.now() when the admin issued it — used to detect "new" commands. */
  issuedAt: number;
  /** Admin UID who issued it. */
  issuedBy?: string;
}

const ACK_KEY = "farmassist-remote-ack";

/** issuedAt of the last command this browser acknowledged. */
function getAcknowledgedAt(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(ACK_KEY) ?? 0);
}

function setAcknowledgedAt(issuedAt: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACK_KEY, String(issuedAt));
}

/**
 * @param userId  Firebase Auth UID of the signed-in account — all
 *                devices on the same account follow together.
 * @param enabled Set false on the rover kiosk screen so it doesn't follow.
 */
export function useRemoteControl(userId: string, enabled: boolean) {
  const [pendingPage, setPendingPage] = useState<string | null>(null);
  // issuedAt of the command currently pending — acknowledged on follow.
  const pendingIssuedAtRef = useRef(0);

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
          pendingIssuedAtRef.current = 0;
          setPendingPage(null);
          return;
        }
        // Only follow commands newer than the last one acknowledged here.
        if (raw.issuedAt <= getAcknowledgedAt()) {
          pendingIssuedAtRef.current = 0;
          setPendingPage(null);
          return;
        }
        pendingIssuedAtRef.current = raw.issuedAt;
        setPendingPage(raw.page);
      },
      (err) => {
        console.error("[useRemoteControl] Firebase read error:", err);
        pendingIssuedAtRef.current = 0;
        setPendingPage(null);
      }
    );

    return () => unsubscribe();
  }, [userId, enabled]);

  /** Acknowledge the current command (marks it handled on this device). */
  const acknowledge = () => {
    // Store the command's own issuedAt, NOT the local clock — otherwise
    // a device whose clock is ahead would suppress all future commands.
    const issuedAt = pendingIssuedAtRef.current;
    if (issuedAt > getAcknowledgedAt()) setAcknowledgedAt(issuedAt);
    pendingIssuedAtRef.current = 0;
    setPendingPage(null);
  };

  return { pendingPage, acknowledge };
}
