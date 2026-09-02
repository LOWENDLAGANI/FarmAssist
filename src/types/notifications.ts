/**
 * notifications.ts
 * ─────────────────────────────────────────────────────────────────
 * Types for the FarmAssist notification system.
 *
 * Only critical alerts are pushed:
 *  • sensor_alert  — sensor value breached a configured threshold
 *  • rover_offline — Rover stopped sending heartbeats
 * ─────────────────────────────────────────────────────────────────
 */

export type NotificationType =
  | "sensor_alert"
  | "rover_offline";

export interface AppNotification {
  /** Auto-generated push key. */
  id: string;
  /** Category of the notification. */
  type: NotificationType;
  /** Short headline shown in the bell panel. */
  title: string;
  /** Body text with details. */
  body: string;
  /** Which Rover this notification is about. */
  deviceId: string;
  /** Unix timestamp (ms) when the notification was created. */
  createdAt: number;
  /** Whether the user has acknowledged this notification. */
  read: boolean;
}
