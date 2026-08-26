/**
 * useProgramme.ts
 * ─────────────────────────────────────────────────────────────────
 * Subscribes to the user's programme/phase data in Firebase RTDB
 * at users/{uid}/programme and derives the welcome-banner badges.
 *
 * Shape stored in RTDB:
 *   {
 *     phase: string,       // e.g. "Lab I - Online Phase"
 *     startDate: string,   // ISO date, e.g. "2026-08-08"
 *     endDate: string,     // ISO date, e.g. "2026-08-13"
 *     completed: boolean,  // whether the programme is finished
 *   }
 *
 * Guests (uid starts with "guest-") and unset paths fall back to
 * DEFAULT_PROGRAMME so the banner always renders.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { onValue, set, type Unsubscribe } from "firebase/database";
import { userProgrammeRef } from "@/lib/firebaseConfig";
import type { WelcomeBadge } from "@/components/WelcomeBanner";

export interface Programme {
  /** Current phase name, e.g. "Lab I - Online Phase". */
  phase: string;
  /** ISO date string for the phase start, e.g. "2026-08-08". */
  startDate: string;
  /** ISO date string for the phase end, e.g. "2026-08-13". */
  endDate: string;
  /** Whether the whole programme is complete. */
  completed: boolean;
}

/** Fallback shown for guests or until real data exists in Firebase. */
export const DEFAULT_PROGRAMME: Programme = {
  phase: "Lab I - Online Phase",
  startDate: "2026-08-08",
  endDate: "2026-08-13",
  completed: false,
};

/** Check if the user is a guest (demo mode). */
function isGuestUser(userId: string): boolean {
  return userId.startsWith("guest-");
}

/** Format an ISO date as "8 Aug 2026" (or the raw string if unparseable). */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Derive the banner badges from programme data. */
function deriveBadges(programme: Programme): WelcomeBadge[] {
  const badges: WelcomeBadge[] = [];

  if (programme.phase) {
    badges.push({ icon: programme.completed ? "🏁" : "📍", label: programme.phase });
  }

  if (programme.startDate && programme.endDate) {
    badges.push({
      icon: "📅",
      label: `${formatDate(programme.startDate)} – ${formatDate(programme.endDate)}`,
    });
  }

  badges.push(
    programme.completed
      ? { icon: "🏁", label: "Programme complete" }
      : { icon: "⏳", label: "In progress" }
  );

  return badges;
}

/**
 * Hook that loads the user's programme data from Firebase RTDB.
 *
 * @param userId - Firebase Auth UID (empty string or guest → defaults)
 */
export function useProgramme(userId: string) {
  const [programme, setProgramme] = useState<Programme>(DEFAULT_PROGRAMME);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  const isGuest = !userId || isGuestUser(userId);

  // ── Subscribe to Firebase programme data when authenticated ──
  useEffect(() => {
    if (isGuest) {
      setProgramme(DEFAULT_PROGRAMME);
      return;
    }

    try {
      unsubscribeRef.current = onValue(
        userProgrammeRef(userId),
        (snapshot) => {
          const data = snapshot.val() as Partial<Programme> | null;

          if (data) {
            setProgramme({
              phase: data.phase ?? DEFAULT_PROGRAMME.phase,
              startDate: data.startDate ?? DEFAULT_PROGRAMME.startDate,
              endDate: data.endDate ?? DEFAULT_PROGRAMME.endDate,
              completed: data.completed ?? DEFAULT_PROGRAMME.completed,
            });
          } else {
            // First time user — no programme node in Firebase yet, seed defaults
            set(userProgrammeRef(userId), DEFAULT_PROGRAMME).catch(console.error);
            setProgramme(DEFAULT_PROGRAMME);
          }
        },
        (err) => {
          console.error("[useProgramme] Firebase read error:", err);
          setProgramme(DEFAULT_PROGRAMME);
        }
      );
    } catch (err) {
      console.error("[useProgramme] Failed to attach listener:", err);
      setProgramme(DEFAULT_PROGRAMME);
    }

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [userId, isGuest]);

  const badges = useMemo(() => deriveBadges(programme), [programme]);

  return { programme, badges };
}
