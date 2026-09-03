/**
 * useBroadcast.ts
 * ─────────────────────────────────────────────────────────────────
 * Subscribes to the global admin broadcasts node in Firebase RTDB
 * at broadcasts/.
 *
 * Broadcast shape stored in RTDB:
 *   {
 *     message: string,                // text to display
 *     mode: "banner" | "popup" | "both",
 *     createdAt: number,              // Date.now()
 *     audience: "all" | { uids: string[] },
 *     active: boolean,                // false once stopped
 *     sentBy: string,                 // admin UID who sent it
 *   }
 *
 * Guests (empty userId) get no broadcasts and are never admins.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect } from "react";
import { onValue } from "firebase/database";
import { broadcastsRef } from "@/lib/firebaseConfig";

export type BroadcastMode = "banner" | "popup" | "both";

/** Who a broadcast is shown to: everyone, or a specific list of UIDs. */
export type BroadcastAudience = "all" | { uids: string[] };

export interface Broadcast {
  /** Push key of the broadcast node. */
  id: string;
  /** Text to display to the user. */
  message: string;
  /** How the message should be shown. */
  mode: BroadcastMode;
  /** Timestamp (Date.now()) when the broadcast was sent. */
  createdAt: number;
  /** Who the broadcast targets. */
  audience: BroadcastAudience;
  /** False once an admin has stopped the broadcast. */
  active: boolean;
  /** Admin UID who sent the broadcast. */
  sentBy?: string;
}

function parseBroadcast(id: string, raw: Record<string, unknown>): Broadcast | null {
  if (!raw || typeof raw.message !== "string" || !raw.message.trim()) return null;

  const rawAudience = raw.audience;
  const audience: BroadcastAudience =
    rawAudience &&
    typeof rawAudience === "object" &&
    Array.isArray((rawAudience as { uids?: unknown }).uids)
      ? { uids: (rawAudience as { uids: string[] }).uids }
      : "all";

  return {
    id,
    message: raw.message,
    mode: raw.mode === "popup" || raw.mode === "both" ? raw.mode : "banner",
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    audience,
    active: raw.active !== false,
    sentBy: typeof raw.sentBy === "string" ? raw.sentBy : undefined,
  };
}

function isForUser(broadcast: Broadcast, userId: string): boolean {
  if (broadcast.audience === "all") return true;
  return broadcast.audience.uids.includes(userId);
}

/**
 * Hook that loads broadcast messages from Firebase RTDB.
 *
 * @param userId - Firebase Auth UID (empty string or guest → no broadcasts)
 * @param opts.includeInactive - when true, also returns stopped broadcasts
 *        (used by the admin composer for history); otherwise only active
 *        broadcasts targeting this user are returned, newest first.
 */
export function useBroadcasts(userId: string, opts?: { includeInactive?: boolean }) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const includeInactive = opts?.includeInactive ?? false;

  useEffect(() => {
    if (!userId) {
      setBroadcasts([]);
      return;
    }

    const unsubscribe = onValue(
      broadcastsRef(),
      (snapshot) => {
        const data = snapshot.val() as Record<string, Record<string, unknown>> | null;
        const list: Broadcast[] = [];

        if (data) {
          for (const [id, raw] of Object.entries(data)) {
            const broadcast = parseBroadcast(id, raw);
            if (!broadcast) continue;
            if (!includeInactive && !broadcast.active) continue;
            if (!includeInactive && !isForUser(broadcast, userId)) continue;
            list.push(broadcast);
          }
        }

        list.sort((a, b) => b.createdAt - a.createdAt);
        setBroadcasts(list);
      },
      (err) => {
        console.error("[useBroadcasts] Firebase read error:", err);
        setBroadcasts([]);
      }
    );

    return () => unsubscribe();
  }, [userId, includeInactive]);

  return { broadcasts };
}