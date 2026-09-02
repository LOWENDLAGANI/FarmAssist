/**
 * HistoryPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * History page with session-based logging and management.
 *
 * Features:
 *  • Start/Stop recording sessions
 *  • Session cards with name, duration, data count, notes
 *  • Rename sessions inline
 *  • View session data on the chart
 *  • Export session data as CSV
 *  • Delete sessions with confirmation
 *  • Pulsing indicator when actively recording
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Play,
  Square,
  Pencil,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Clock,
  FileText,
  Circle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import type { LoggingSession, SessionDataPoint } from "@/hooks/useLoggingSession";
import type { SensorKey, ChartDataPoint } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";
import ChartSection from "../ChartSection";

interface HistoryPageProps {
  sessions: LoggingSession[];
  activeSession: LoggingSession | null;
  isLoading: boolean;
  onStartSession: (name?: string) => void;
  onStopSession: () => void;
  onRenameSession: (id: string, name: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDeleteSession: (id: string) => void;
  onLoadSessionData: (id: string) => Promise<SessionDataPoint[]>;
  onSubscribeSessionData: (id: string, callback: (data: SessionDataPoint[]) => void) => () => void;
  onExportCSV: (id: string, name: string) => void;
}

/** Format a duration in ms to "Xm Ys" or "Xh Ym". */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/** Format a timestamp to a readable date/time. */
function formatDate(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage({
  sessions,
  activeSession,
  isLoading,
  onStartSession,
  onStopSession,
  onRenameSession,
  onUpdateNotes,
  onDeleteSession,
  onLoadSessionData,
  onSubscribeSessionData,
  onExportCSV,
}: HistoryPageProps) {
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [viewingData, setViewingData] = useState<SessionDataPoint[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ── Inline rename state ──────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  // ── Delete confirmation ──────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── New session name input ───────────────────────────────────
  const [newSessionName, setNewSessionName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  // ── View session data ────────────────────────────────────────
  const handleViewSession = useCallback(
    (sessionId: string) => {
      if (viewingSessionId === sessionId) {
        setViewingSessionId(null);
        setViewingData([]);
        return;
      }
      setViewingSessionId(sessionId);
      setLoadingData(true);
    },
    [viewingSessionId]
  );

  // ── Derive whether the viewed session is still active ──────
  const viewedSession = useMemo(
    () => sessions.find((s) => s.id === viewingSessionId) ?? null,
    [sessions, viewingSessionId]
  );
  const isViewingActive = viewedSession?.endDate === null;

  // ── Real-time data for active sessions / one-shot for completed ─
  useEffect(() => {
    if (!viewingSessionId) {
      setLoadingData(false);
      return;
    }

    if (isViewingActive) {
      // Active session: subscribe to real-time updates
      setLoadingData(true);
      const unsubscribe = onSubscribeSessionData(viewingSessionId, (data) => {
        setViewingData(data);
        setLoadingData(false);
      });
      return () => unsubscribe();
    }

    if (isViewingActive === false) {
      // Completed session: one-shot load
      setLoadingData(true);
      let cancelled = false;
      onLoadSessionData(viewingSessionId)
        .then((data) => {
          if (!cancelled) {
            setViewingData(data);
            setLoadingData(false);
          }
        })
        .catch(console.error);
      return () => { cancelled = true; };
    }
  }, [viewingSessionId, isViewingActive, onSubscribeSessionData, onLoadSessionData]);

  // ── Convert session data to chart format ─────────────────────
  const viewingChartData: ChartDataPoint[] = useMemo(() => {
    return viewingData.map((p) => ({
      timestamp: p.timestamp,
      value: p.temperature,
    }));
  }, [viewingData]);

  // ── Active sensor for session chart ──────────────────────────
  const [sessionSensor, setSessionSensor] = useState<SensorKey>("temperature");

  // ── Start with custom name ───────────────────────────────────
  const handleStart = () => {
    if (showNameInput && newSessionName.trim()) {
      onStartSession(newSessionName.trim());
      setNewSessionName("");
      setShowNameInput(false);
    } else {
      onStartSession();
    }
  };

  // ── Save rename ──────────────────────────────────────────────
  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onRenameSession(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  // ── Save notes ───────────────────────────────────────────────
  const handleSaveNotes = (id: string) => {
    onUpdateNotes(id, editingNotes);
    setEditingNotesId(null);
    setEditingNotes("");
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">History</h2>
          <p className="text-sm text-slate-400">
            Log your sensor data history for your plant
          </p>
        </div>

        {/* ── Start/Stop Controls ── */}
        <div className="flex items-center gap-3">
          {activeSession ? (
            <>
              {/* Recording indicator */}
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-medium text-red-400">
                  Recording
                </span>
              </div>
              <button
                onClick={onStopSession}
                className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </>
          ) : (
            <>
              {showNameInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    placeholder="Session name (optional)"
                    className="w-48 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                    autoFocus
                  />
                  <button
                    onClick={handleStart}
                    className="rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNameInput(false);
                      setNewSessionName("");
                    }}
                    className="rounded-xl bg-slate-500/20 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-500/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
                  >
                    <Play className="h-4 w-4" />
                    Start Recording
                  </button>
                  <button
                    onClick={() => setShowNameInput(true)}
                    className="rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
                    title="Custom name"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Session Chart (when viewing) ── */}
      {viewingSessionId && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-sm font-medium text-white">Viewing:</span>
            <span className="text-sm text-cyan-400">
              {sessions.find((s) => s.id === viewingSessionId)?.name}
            </span>
            <div className="flex gap-1 ml-4">
              {(Object.keys(SENSOR_META) as SensorKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSessionSensor(key)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                    sessionSensor === key
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {SENSOR_META[key].label}
                </button>
              ))}
            </div>
          </div>
          {loadingData ? (
            <div className="flex h-56 items-center justify-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            </div>
          ) : (
            <ChartSection
              activeSensor={sessionSensor}
              history={viewingData.map((p) => ({
                timestamp: p.timestamp,
                value: p[sessionSensor] ?? 0,
              }))}
            />
          )}
        </div>
      )}

      {/* ── Sessions List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] py-16">
          <FileText className="mb-3 h-12 w-12 text-slate-600" />
          <p className="text-sm text-slate-400">Nothing</p>
          <p className="text-xs text-slate-500">
            Click &quot;Start Recording&quot; to begin logging
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Session count */}
          <p className="text-xs text-slate-500">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}{" "}
            {activeSession ? "· 1 recording" : ""}
          </p>

          {sessions.map((session) => {
            const isActive = session.endDate === null;
            const isViewing = viewingSessionId === session.id;
            const isEditing = editingId === session.id;
            const isEditingNotes = editingNotesId === session.id;
            const isConfirmingDelete = deletingId === session.id;
            const duration = isActive
              ? Date.now() - session.startDate
              : session.endDate! - session.startDate;

            return (
              <div
                key={session.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isActive
                    ? "border-red-500/30 bg-red-950/10"
                    : isViewing
                      ? "border-cyan-500/40 bg-[#0d1f35] shadow-lg shadow-cyan-500/10"
                      : "border-cyan-900/20 bg-[#0c1a2e] hover:border-cyan-800/30"
                }`}
              >
                {/* ── Session Header ── */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Active indicator */}
                      {isActive && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                      )}

                      {/* Session name (editable) */}
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(session.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="rounded-lg border border-cyan-900/30 bg-[#0a1628] px-2 py-1 text-sm text-white outline-none focus:border-cyan-500/50"
                            autoFocus
                          />
                          <button onClick={() => handleSaveRename(session.id)} className="text-emerald-400">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-slate-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-white truncate">
                          {session.name}
                        </span>
                      )}

                      {/* Status badge */}
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? "bg-red-500/20 text-red-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {isActive ? "Active" : "Completed"}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.startDate)}
                      </span>
                      {session.endDate && (
                        <span>→ {formatDate(session.endDate)}</span>
                      )}
                      <span>· {formatDuration(duration)}</span>
                      <span>{session.dataCount} points</span>
                    </div>

                    {/* Notes */}
                    {isEditingNotes ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNotes(session.id);
                            if (e.key === "Escape") setEditingNotesId(null);
                          }}
                          placeholder="Add notes..."
                          className="flex-1 rounded-lg border border-cyan-900/30 bg-[#0a1628] px-2 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                          autoFocus
                        />
                        <button onClick={() => handleSaveNotes(session.id)} className="text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingNotesId(null)} className="text-slate-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : session.notes ? (
                      <p className="mt-2 text-xs text-slate-400 italic">
                        {session.notes}
                      </p>
                    ) : null}
                  </div>

                  {/* ── Actions ── */}
                  <div className="flex shrink-0 items-center gap-1">
                    {/* View */}
                    <button
                      onClick={() => handleViewSession(session.id)}
                      className={`rounded-lg p-2 transition-colors ${
                        isViewing
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "text-slate-500 hover:bg-[#0f2240] hover:text-white"
                      }`}
                      title={isViewing ? "Hide chart" : "View on chart"}
                    >
                      {isViewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>

                    {/* Rename */}
                    {!isActive && (
                      <button
                        onClick={() => {
                          setEditingId(session.id);
                          setEditingName(session.name);
                        }}
                        className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}

                    {/* Notes */}
                    <button
                      onClick={() => {
                        setEditingNotesId(session.id);
                        setEditingNotes(session.notes);
                      }}
                      className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
                      title="Add notes"
                    >
                      <FileText className="h-4 w-4" />
                    </button>

                    {/* Export */}
                    {!isActive && session.dataCount > 0 && (
                      <button
                        onClick={() => onExportCSV(session.id, session.name)}
                        className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
                        title="Export CSV"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}

                    {/* Delete */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onDeleteSession(session.id);
                            setDeletingId(null);
                          }}
                          className="rounded-lg bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-400"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="rounded-lg bg-slate-500/20 px-2 py-1 text-[10px] text-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(session.id)}
                        className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-950/50 hover:text-red-400"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Data Preview (expandable) ── */}
                {isViewing && viewingData.length > 0 && !loadingData && (
                  <div className="mt-3 border-t border-cyan-900/20 pt-3">
                    <p className="mb-2 text-[10px] text-slate-500">
                      Showing {viewingData.length} data points
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-xl bg-[#0a1628]">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-cyan-900/20">
                            <th className="px-3 py-1.5 text-slate-500">Time</th>
                            <th className="px-3 py-1.5 text-slate-500">Temp</th>
                            <th className="px-3 py-1.5 text-slate-500">Moist</th>
                            <th className="px-3 py-1.5 text-slate-500">Water</th>
                            <th className="px-3 py-1.5 text-slate-500">Light</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingData.slice(-10).reverse().map((p, i) => (
                            <tr key={i} className="border-b border-cyan-900/10">
                              <td className="px-3 py-1 text-slate-400">
                                {new Date(p.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </td>
                              <td className="px-3 py-1 text-orange-400">{p.temperature.toFixed(1)}°</td>
                              <td className="px-3 py-1 text-emerald-400">{p.moisture}%</td>
                              <td className="px-3 py-1 text-cyan-400">{p.waterLevel}%</td>
                              <td className="px-3 py-1 text-yellow-400">{p.light}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
