/**
 * adminConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Single-admin configuration. The account with this UID is the only
 * one that can access the Admin Panel (and send broadcasts).
 *
 * ⚠️ Keep this UID in sync with database.rules.json — the broadcast
 * write rule uses the same value.
 * ─────────────────────────────────────────────────────────────────
 */

/** The sole admin account (the app owner). */
export const ADMIN_UID = "tsYo3zKfr8SSowOE23lPQe8Kb0v2";

/** True only for the admin account. */
export function isAdminUser(uid: string | null | undefined): boolean {
  return !!uid && uid === ADMIN_UID;
}