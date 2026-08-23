/**
 * useLoggingSession.ts
 * ─────────────────────────────────────────────────────────────────
 * Manages history logging sessions for sensor data recording.
 *
 * A session is a named recording period:
 *  - User clicks "Start" → creates a new session in RTDB
 *  - Sensor data is written to users/{uid}/devices/{id}/sessions/{sid}/data while active
 *  - User clicks "Stop" → sets endDate on the session
 *
 * Features:
 *  - Auto-generates session names ("Session · Aug 23, 2:30 PM")
 *  - Rename / delete sessions
 *  - View session data points
 *  - Export session data as CSV
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onValue, push, set, update, get, remove } from "firebase/database";
import { sessionsRef, sessionDataRef, sessionRef } from "@/lib/firebaseConfig";
import type { SensorTelemetry } from "@/types/telemetry";

/** Session metadata stored in RTDB. */
export interface LoggingSession {
  id: string;
  name: string;
  notes: string;
  startDate: number;
  endDate: number | null;
  dataCount: number;
}

/** A single data point inside a session. */
export interface SessionDataPoint {
  timestamp: number;
  temperature: number;
  moisture: number;
  waterLevel: number;
  light: number;
}

/** Default session name based on current time. */
function autoName(): string {
  const now = new Date();
  const month = now.toLocaleString("default", { month: "short" });
  const day = now.getDate();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `Session · ${month} ${day}, ${time}`;
}

/**
 * Hook for managing logging sessions.
 *
 * @param userId   - The Firebase Auth UID
 * @param deviceId - The device ID to manage sessions for
 * @returns        - sessions, activeSession, start, stop, rename, delete, etc.
 */
export function useLoggingSession(userId: string, deviceId: string) {
  const [sessions, setSessions] = useState<LoggingSession[]>([]);
  const [activeSession, setActiveSession] = useState<LoggingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track active session ID in ref for callback access
  const activeSessionRef = useRef<LoggingSession | null>(null);
  activeSessionRef.current = activeSession;

  // ── Load sessions from RTDB ─────────────────────────────────
  useEffect(() => {
    if (!userId || !deviceId) return;
    setIsLoading(true);

    const dbRef = sessionsRef(userId, deviceId);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const sessionsList: LoggingSession[] = [];

      snapshot.forEach((childSnap) => {
        const val = childSnap.val();
        if (val && typeof val.name === "string") {
          sessionsList.push({
            id: childSnap.key!,
            name: val.name,
            notes: val.notes ?? "",
            startDate: val.startDate ?? 0,
            endDate: val.endDate ?? null,
            dataCount: val.dataCount ?? 0,
          });
        }
      });

      // Sort by start date descending (newest first)
      sessionsList.sort((a, b) => b.startDate - a.startDate);
      setSessions(sessionsList);

      // Check if there's an active (unclosed) session
      const active = sessionsList.find((s) => s.endDate === null);
      setActiveSession(active ?? null);

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, deviceId]);

  // ── Start a new session ─────────────────────────────────────
  const startSession = useCallback(
    async (name?: string) => {
      const dbRef = sessionsRef(userId, deviceId);
      const newRef = push(dbRef);
      const sessionId = newRef.key!;

      const session: LoggingSession = {
        id: sessionId,
        name: name ?? autoName(),
        notes: "",
        startDate: Date.now(),
        endDate: null,
        dataCount: 0,
      };

      await set(newRef, {
        name: session.name,
        notes: session.notes,
        startDate: session.startDate,
        endDate: null,
        dataCount: 0,
      }).catch(console.error);

      return session;
    },
    [userId, deviceId]
  );

  // ── Stop the active session ─────────────────────────────────
  const stopSession = useCallback(async () => {
    const active = activeSessionRef.current;
    if (!active) return;

    const dbRef = sessionRef(userId, active.id, deviceId);
    // Use update() instead of set() to avoid destroying the 'data' child
    await update(dbRef, {
      endDate: Date.now(),
    }).catch(console.error);
  }, [userId, deviceId]);

  // ── Rename a session ────────────────────────────────────────
  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      const dbRef = sessionRef(userId, sessionId, deviceId);
      await update(dbRef, { name: newName }).catch(console.error);
    },
    [userId, deviceId]
  );

  // ── Update session notes ────────────────────────────────────
  const updateNotes = useCallback(
    async (sessionId: string, notes: string) => {
      const dbRef = sessionRef(userId, sessionId, deviceId);
      await update(dbRef, { notes }).catch(console.error);
    },
    [userId, deviceId]
  );

  // ── Delete a session ────────────────────────────────────────
  const deleteSession = useCallback(
    async (sessionId: string) => {
      const dbRef = sessionRef(userId, sessionId, deviceId);
      await remove(dbRef).catch(console.error);
    },
    [userId, deviceId]
  );

  // ── Load session data points ────────────────────────────────
  const loadSessionData = useCallback(
    async (sessionId: string): Promise<SessionDataPoint[]> => {
      const dbRef = sessionDataRef(userId, sessionId, deviceId);
      const snap = await get(dbRef);
      const points: SessionDataPoint[] = [];

      if (snap.exists()) {
        snap.forEach((child) => {
          const val = child.val();
          if (val && typeof val.timestamp === "number") {
            points.push({
              timestamp: val.timestamp,
              temperature: val.temperature ?? 0,
              moisture: val.moisture ?? 0,
              waterLevel: val.waterLevel ?? 0,
              light: val.light ?? 0,
            });
          }
        });
      }

      return points.sort((a, b) => a.timestamp - b.timestamp);
    },
    [userId, deviceId]
  );

  // ── Subscribe to session data (real-time) ─────────────────
  const subscribeToSessionData = useCallback(
    (sessionId: string, callback: (data: SessionDataPoint[]) => void): (() => void) => {
      const dbRef = sessionDataRef(userId, sessionId, deviceId);
      const unsubscribe = onValue(dbRef, (snap) => {
        const points: SessionDataPoint[] = [];
        snap.forEach((child) => {
          const val = child.val();
          if (val && typeof val.timestamp === "number") {
            points.push({
              timestamp: val.timestamp,
              temperature: val.temperature ?? 0,
              moisture: val.moisture ?? 0,
              waterLevel: val.waterLevel ?? 0,
              light: val.light ?? 0,
            });
          }
        });
        callback(points.sort((a, b) => a.timestamp - b.timestamp));
      });
      return unsubscribe;
    },
    [userId, deviceId]
  );

  // ── Write data point to active session ──────────────────────
  const writeToSession = useCallback(
    async (data: SensorTelemetry) => {
      const active = activeSessionRef.current;
      if (!active) return;

      const dbRef = sessionDataRef(userId, active.id, deviceId);
      await push(dbRef, {
        timestamp: data.timestamp,
        temperature: data.temperature,
        moisture: data.moisture,
        waterLevel: data.waterLevel,
        light: data.light,
      }).catch(console.error);

      // Update data count atomically
      const countRef = sessionRef(userId, active.id, deviceId);
      const snap = await get(countRef);
      if (snap.exists()) {
        const val = snap.val();
        await update(countRef, {
          dataCount: (val.dataCount ?? 0) + 1,
        }).catch(console.error);
      }
    },
    [userId, deviceId]
  );

  // ── Export session data as CSV ──────────────────────────────
  const exportSessionCSV = useCallback(
    async (sessionId: string, sessionName: string) => {
      const points = await loadSessionData(sessionId);
      if (points.length === 0) return;

      const header = "Timestamp,Time,Temperature (°C),Moisture (%),Water Level (%),Light (lux)\n";
      const rows = points
        .map((p) => {
          const date = new Date(p.timestamp);
          return `${p.timestamp},${date.toLocaleString()},${p.temperature},${p.moisture},${p.waterLevel},${p.light}`;
        })
        .join("\n");

      const csv = header + rows;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sessionName.replace(/[^a-z0-9]/gi, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [loadSessionData]
  );

  return {
    sessions,
    activeSession,
    isLoading,
    startSession,
    stopSession,
    renameSession,
    updateNotes,
    deleteSession,
    loadSessionData,
    subscribeToSessionData,
    writeToSession,
    exportSessionCSV,
  };
}
