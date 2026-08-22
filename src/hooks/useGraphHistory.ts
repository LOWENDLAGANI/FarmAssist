/**
 * useGraphHistory.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for persisting graph snapshots to a dedicated RTDB
 * node (`sensors/history/{metricType}`) and automatically
 * pruning old entries beyond the MAX_GRAPH_HISTORY limit.
 *
 * RTDB path: sensors/history/{metricType}/{snapshotId}
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";
import {
  push,
  get,
  remove,
  set,
  child,
  query,
  orderByChild,
  limitToFirst,
  type DataSnapshot,
} from "firebase/database";
import { historyRef } from "@/lib/firebaseConfig";
import type { SensorKey, ChartDataPoint } from "@/types/telemetry";
import { MAX_GRAPH_HISTORY } from "@/types/telemetry";

/**
 * Persists a new graph snapshot to RTDB.
 * Automatically cleans up old records if the node exceeds MAX_GRAPH_HISTORY.
 *
 * @param metricType - The sensor metric this snapshot represents
 * @param dataPoints - Array of timestamped data points
 */
export async function saveGraphSnapshot(
  metricType: SensorKey,
  dataPoints: ChartDataPoint[]
): Promise<void> {
  const nodeRef = historyRef(metricType);

  // Add the new snapshot with a push key
  const newRef = push(nodeRef);
  if (!newRef) throw new Error("Failed to create RTDB reference");

  await set(newRef, {
    metricType,
    dataPoints,
    createdAt: Date.now(),
  });

  // Prune old records if over limit
  await pruneOldSnapshots(metricType);
}

/**
 * Deletes the oldest graph_history entries when count exceeds MAX_GRAPH_HISTORY.
 * This ensures the node stays bounded and costs remain predictable.
 */
async function pruneOldSnapshots(
  metricType: string
): Promise<void> {
  const nodeRef = historyRef(metricType);

  const countQuery = query(nodeRef, orderByChild("createdAt"), limitToFirst(200));
  const snapshot = await get(countQuery);

  if (!snapshot.exists()) return;

  const children: Array<{ key: string; createdAt: number }> = [];
  snapshot.forEach((childSnap: DataSnapshot) => {
    const val = childSnap.val();
    if (val && typeof val.createdAt === "number") {
      children.push({ key: childSnap.key!, createdAt: val.createdAt });
    }
  });

  if (children.length > MAX_GRAPH_HISTORY) {
    const excess = children.length - MAX_GRAPH_HISTORY;
    const toDelete = children
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, excess);

    await Promise.all(
      toDelete.map((entry) => remove(child(nodeRef, entry.key!)))
    );
  }
}

/**
 * Fetches the latest graph snapshot for a given metric type.
 * Used on page load to hydrate the chart with persisted data.
 */
export async function fetchLatestSnapshot(
  metricType: SensorKey
): Promise<ChartDataPoint[] | null> {
  const nodeRef = historyRef(metricType);

  const q = query(
    nodeRef,
    orderByChild("createdAt"),
    limitToFirst(1)
  );

  const snapshot = await get(q);
  if (!snapshot.exists()) return null;

  // For a query result, val() returns an object keyed by push IDs
  const allData = snapshot.val() as Record<string, { metricType?: string; dataPoints?: ChartDataPoint[] }> | null;
  if (!allData) return null;

  // Get the first entry (only one due to limitToFirst(1))
  const firstKey = Object.keys(allData)[0];
  if (!firstKey) return null;

  const latestData = allData[firstKey];
  if (!latestData || latestData.metricType !== metricType) return null;

  return (latestData.dataPoints as ChartDataPoint[]) ?? null;
}

/**
 * Hook that exposes graph history persistence utilities.
 * Handles saving snapshots on an interval and loading persisted data.
 */
export function useGraphHistory() {
  const [isSaving, setIsSaving] = useState(false);

  const saveSnapshot = useCallback(
    async (metricType: SensorKey, dataPoints: ChartDataPoint[]) => {
      if (dataPoints.length === 0) return;
      setIsSaving(true);
      try {
        await saveGraphSnapshot(metricType, dataPoints);
      } catch (err) {
        console.error("[useGraphHistory] Failed to save snapshot:", err);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const loadSnapshot = useCallback(
    async (metricType: SensorKey): Promise<ChartDataPoint[] | null> => {
      try {
        return await fetchLatestSnapshot(metricType);
      } catch (err) {
        console.error("[useGraphHistory] Failed to load snapshot:", err);
        return null;
      }
    },
    []
  );

  return {
    saveSnapshot,
    loadSnapshot,
    isSaving,
  };
}
