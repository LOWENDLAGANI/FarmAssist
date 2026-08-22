/**
 * HistoryPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Historical data page showing past sensor readings.
 * Displays a table of recent readings from the rolling buffer.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { ChartDataPoint } from "@/types/telemetry";

interface HistoryPageProps {
  history: ChartDataPoint[];
}

export default function HistoryPage({ history }: HistoryPageProps) {
  // Reverse to show newest first
  const sorted = [...history].reverse();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">History</h2>
        <p className="text-sm text-slate-400">Recent sensor readings from the last {history.length} updates</p>
      </div>

      {sorted.length > 0 ? (
        <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cyan-900/20 bg-[#0a1628]">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400">#</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400">Time</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400">Value</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((point, i) => (
                <tr
                  key={`${point.timestamp}-${i}`}
                  className="border-b border-cyan-900/10 transition-colors hover:bg-[#0f2240]"
                >
                  <td className="px-4 py-3 text-slate-500">{history.length - i}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(point.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{point.value.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] py-16">
          <p className="text-sm text-slate-400">No history data yet</p>
          <p className="text-xs text-slate-500">Readings will appear here as they come in</p>
        </div>
      )}
    </div>
  );
}
