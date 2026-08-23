/**
 * formatLastSeen.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared utility for formatting a lastSeen timestamp into a
 * human-readable relative string (e.g. "just now", "3m ago").
 * ─────────────────────────────────────────────────────────────────
 */

export function formatLastSeen(lastSeenMs: number): string {
  const now = Date.now();
  const diffMs = now - lastSeenMs;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 0) return "just now"; // future timestamp (clock skew)
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  return `${diffDay}d ${diffHr % 24}h ago`;
}
