/**
 * bans.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared types + helpers for the user-ban system.
 *
 * Bans live in Realtime Database at `bans/{uid}` and are ONLY written
 * by the server-side callables (banUser / unbanUser in Cloud
 * Functions) — clients can never write here (see database.rules.json).
 *
 * Ban record shape stored in RTDB:
 *   {
 *     uid: string,             // banned account UID
 *     displayName: string|null, // profile snapshot at ban time
 *     email: string|null,       // email snapshot at ban time
 *     photoURL: string|null,    // avatar snapshot at ban time
 *     reason: string,           // why the user was banned (shown to them)
 *     bannedAt: number,         // Date.now() when the ban was issued
 *     expiresAt: number,        // Date.now() when it lifts; 0 = permanent
 *     bannedBy: string,         // admin UID who issued the ban
 *   }
 * ─────────────────────────────────────────────────────────────────
 */

export interface BanRecord {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  reason: string;
  bannedAt: number;
  /** 0 means permanent; otherwise a Date.now() expiry timestamp. */
  expiresAt: number;
  bannedBy: string;
}

/** A user returned by the admin-only `searchUsers` callable. */
export interface SearchUserResult {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  disabled: boolean;
}

/** True while the ban is still in effect (not yet expired). */
export function isBanActive(record: BanRecord): boolean {
  return record.expiresAt === 0 || Date.now() < record.expiresAt;
}

/**
 * Parse a raw RTDB snapshot into a BanRecord. Returns null when the
 * value isn't a valid ban record (node removed, malformed, …).
 * Does NOT check expiry — call isBanActive() for that.
 */
export function parseBanRecord(
  raw: Record<string, unknown> | null | undefined
): BanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const uid = typeof raw.uid === "string" ? raw.uid : "";
  if (!uid) return null;
  return {
    uid,
    displayName: typeof raw.displayName === "string" ? raw.displayName : null,
    email: typeof raw.email === "string" ? raw.email : null,
    photoURL: typeof raw.photoURL === "string" ? raw.photoURL : null,
    reason:
      typeof raw.reason === "string" && raw.reason.trim()
        ? raw.reason
        : "No reason provided.",
    bannedAt: typeof raw.bannedAt === "number" ? raw.bannedAt : Date.now(),
    expiresAt: typeof raw.expiresAt === "number" ? raw.expiresAt : 0,
    bannedBy: typeof raw.bannedBy === "string" ? raw.bannedBy : "",
  };
}

export interface BanDurationOption {
  id: string;
  label: string;
  /** Milliseconds; 0 = permanent. */
  ms: number;
}

/** Duration choices offered in the admin ban composer. */
export const BAN_DURATIONS: BanDurationOption[] = [
  { id: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { id: "6h", label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  { id: "12h", label: "12 hours", ms: 12 * 60 * 60 * 1000 },
  { id: "1d", label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { id: "3d", label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { id: "7d", label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "1 month", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "permanent", label: "Permanent", ms: 0 },
];

/** "Permanent", or a localized date + time the ban lifts. */
export function formatBanExpiry(expiresAt: number): string {
  if (expiresAt === 0) return "Permanent";
  return new Date(expiresAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "3 days", "1 hour", "permanent" — human label for a duration in ms. */
export function formatBanDuration(ms: number): string {
  if (ms === 0) return "permanent";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"}`;
}
