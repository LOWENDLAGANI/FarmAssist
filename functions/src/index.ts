/**
 * Firebase Cloud Functions — FarmAssist Push Notifications (v2 / Modular)
 * ─────────────────────────────────────────────────────────────────
 * Server-side functions that send FCM push notifications for
 * critical events. Set globally to the asia-southeast1 region.
 *
 * Functions:
 *  • askAssistant   — callable; Gemini-powered in-app help assistant
 *  • onSensorAlert  — triggers on telemetry write, checks thresholds
 *  • onForcePair    — triggers on rover_registry update
 * ─────────────────────────────────────────────────────────────────
 */

import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onValueWritten, onValueUpdated } from "firebase-functions/v2/database";
import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
initializeApp();

const db = getDatabase();
const messaging = getMessaging();

// Set Asia server (Singapore) globally for all v2 functions
setGlobalOptions({ region: "asia-southeast1" });

const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const SMS_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown for SMS
const OWNER_UID = "tsYo3zKfr8SSowOE23lPQe8Kb0v2";

// Lazy-load cached system prompt to prevent top-level initialization timeouts
let cachedSystemPrompt: string | null = null;
function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    try {
      const promptPath = path.join(__dirname, "..", "systemPrompt.txt");
      cachedSystemPrompt = fs.readFileSync(promptPath, "utf-8");
    } catch (err) {
      logger.error("Failed to read systemPrompt.txt:", err);
      cachedSystemPrompt = "You are a helpful assistant for FarmAssist.";
    }
  }
  return cachedSystemPrompt;
}

// ── Sensor threshold alert ──────────────────────────────────────
export const onSensorAlert = onValueWritten(
  "/users/{uid}/devices/{deviceId}/latest",
  async (event) => {
    const uid = event.params.uid;
    const deviceId = event.params.deviceId;
    const data = event.data.after.val();
    if (!data) return;

    const rangesSnap = await db
      .ref(`users/${uid}/devices/${deviceId}/ranges`)
      .get();
    const ranges = rangesSnap.val();
    if (!ranges) return;

    const tokenSnap = await db.ref(`users/${uid}/fcmToken`).get();
    const tokenData = tokenSnap.val();
    if (!tokenData?.token) return;

    const alerts: string[] = [];

    const checks: Array<{
      key: string;
      label: string;
      unit: string;
      value: number;
    }> = [
      { key: "temperature", label: "Temperature", unit: "°C", value: data.temperature },
      { key: "moisture", label: "Soil Moisture", unit: "%", value: data.moisture },
      { key: "waterLevel", label: "Water Level", unit: "%", value: data.waterLevel },
      { key: "light", label: "Light", unit: "lux", value: data.light },
    ];

    for (const { key, label, unit, value } of checks) {
      if (typeof value !== "number") continue;
      const range = ranges[key];
      if (!range) continue;
      if (value > range.optimalMax) {
        alerts.push(`${label} is ${value}${unit} (max: ${range.optimalMax}${unit})`);
      } else if (value < range.optimalMin) {
        alerts.push(`${label} is ${value}${unit} (min: ${range.optimalMin}${unit})`);
      }
    }

    if (alerts.length === 0) return;

    const cooldownKey = `lastAlert_${deviceId}`;
    const cooldownSnap = await db
      .ref(`_cooldowns/${uid}/${cooldownKey}`)
      .get();
    const lastAlert = cooldownSnap.val() ?? 0;
    if (Date.now() - lastAlert < ALERT_COOLDOWN_MS) return;
    await db.ref(`_cooldowns/${uid}/${cooldownKey}`).set(Date.now());

    try {
      await messaging.send({
        token: tokenData.token,
        notification: {
          title: `Sensor Alert — ${deviceId}`,
          body: alerts.join("; "),
        },
        data: { deviceId, type: "sensor_alert" },
        webpush: {
          fcmOptions: { link: "/" },
          notification: {
            icon: "/favicon.ico",
            tag: `sensor_${deviceId}`,
            renotify: true,
          },
        },
      });
      logger.info(`Push sent to ${uid} for ${deviceId}`);
    } catch (err: any) {
      if (
        err.code === "messaging/registration-token-not-registered" ||
        err.code === "messaging/invalid-registration-token"
      ) {
        await db.ref(`users/${uid}/fcmToken`).remove();
        logger.warn(`Removed stale FCM token for ${uid}`);
      } else {
        logger.error("Push send failed:", err);
      }
    }
  }
);

// ── Force-pair alert ────────────────────────────────────────────
export const onForcePair = onValueUpdated(
  "/rover_registry/{deviceId}",
  async (event) => {
    const deviceId = event.params.deviceId;
    const before = event.data.before.val();
    const after = event.data.after.val();

    if (!before || !after) return;
    if (before.ownerUid === after.ownerUid) return;
    if (!before.ownerUid) return;

    const prevOwnerUid = before.ownerUid;
    if (before.paired === false && after.paired === true) return;

    const tokenSnap = await db
      .ref(`users/${prevOwnerUid}/fcmToken`)
      .get();
    const tokenData = tokenSnap.val();
    if (!tokenData?.token) return;

    try {
      await messaging.send({
        token: tokenData.token,
        notification: {
          title: `Rover Claimed — ${deviceId}`,
          body: `Your Rover "${deviceId}" was claimed by another account.`,
        },
        data: { deviceId, type: "force_pair" },
        webpush: {
          fcmOptions: { link: "/settings" },
          notification: {
            icon: "/favicon.ico",
            tag: `force_pair_${deviceId}`,
            renotify: true,
          },
        },
      });
      logger.info(`Force-pair push sent to ${prevOwnerUid}`);
    } catch (err: any) {
      if (
        err.code === "messaging/registration-token-not-registered" ||
        err.code === "messaging/invalid-registration-token"
      ) {
        await db.ref(`users/${prevOwnerUid}/fcmToken`).remove();
      } else {
        logger.error("Force-pair push failed:", err);
      }
    }
  }
);

// ── AI Help Assistant (Gemini) ──────────────────────────────────
const ASSISTANT_RATE_LIMIT = { maxCalls: 20, windowMs: 60 * 1000 };
const assistantRateMap = new Map<string, number[]>();

interface AssistantTurn {
  role: "user" | "model";
  text: string;
}

export const askAssistant = onCall(
  { secrets: ["GEMINI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in to chat with the assistant."
      );
    }
    const uid: string = request.auth.uid;
    const data = request.data;

    const message =
      typeof data?.message === "string" ? data.message.trim() : "";
    if (!message || message.length > 1000) {
      throw new HttpsError(
        "invalid-argument",
        "Message must be between 1 and 1000 characters."
      );
    }

    const history: AssistantTurn[] = Array.isArray(data?.history)
      ? (data.history as unknown[])
          .filter(
            (t): t is AssistantTurn =>
              !!t &&
              typeof (t as AssistantTurn).text === "string" &&
              ((t as AssistantTurn).role === "user" ||
                (t as AssistantTurn).role === "model")
          )
          .slice(-12)
          .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }))
      : [];

    const now = Date.now();
    const stamps = (assistantRateMap.get(uid) ?? []).filter(
      (t) => now - t < ASSISTANT_RATE_LIMIT.windowMs
    );
    if (stamps.length >= ASSISTANT_RATE_LIMIT.maxCalls) {
      throw new HttpsError(
        "resource-exhausted",
        "You're sending messages too fast — take a short breather! 🌱"
      );
    }
    stamps.push(now);
    assistantRateMap.set(uid, stamps);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY secret is not set");
      throw new HttpsError(
        "failed-precondition",
        "The assistant isn't configured yet. Try again later."
      );
    }

    const systemPrompt = getSystemPrompt();
    const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
    const contents = [
      ...history.map((t) => ({
        role: t.role,
        parts: [{ text: t.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    let reply: string | undefined;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 512,
            },
          }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        logger.error(
          `Gemini HTTP ${res.status} for model ${model}. Body: ${body}`
        );
        throw new Error(`Gemini responded ${res.status}`);
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        promptFeedback?: { blockReason?: string; finishReason?: string };
      };
      logger.info("Gemini response:", JSON.stringify({
        hasCandidates: !!json.candidates?.length,
        promptFeedback: json.promptFeedback,
        candidateCount: json.candidates?.length ?? 0,
      }));
      if (json.promptFeedback?.blockReason) {
        logger.error("Gemini blocked prompt:", json.promptFeedback.blockReason);
        throw new HttpsError(
          "internal",
          "I couldn't respond to that — it may have been flagged by content filters."
        );
      }
      reply = json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();
    } catch (err: any) {
      logger.error("Gemini call failed:", err?.message ?? err);
      throw new HttpsError(
        "internal",
        "The assistant had trouble responding. Please try again."
      );
    }

    if (!reply) {
      throw new HttpsError(
        "internal",
        "The assistant couldn't generate a reply. Please try rephrasing."
      );
    }

    return { reply };
  }
);

// ── Twilio SMS Helper ────────────────────────────────────────────
async function getTwilioClient() {
  const twilio = (await import("twilio")).default;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new HttpsError(
      "failed-precondition",
      "SMS service is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }
  return twilio(accountSid, authToken);
}

function getTwilioFromNumber(): string {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new HttpsError(
      "failed-precondition",
      "SMS service is not configured. Set TWILIO_PHONE_NUMBER."
    );
  }
  return from;
}

// ── sendSms — callable; sends a test SMS ─────────────────────────
export const sendSms = onCall(
  { secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to send SMS.");
    }

    // Only allow the owner to send test SMS
    if (request.auth.uid !== OWNER_UID) {
      throw new HttpsError("permission-denied", "Only the owner can send test SMS.");
    }

    const { to, body } = request.data as { to?: string; body?: string };

    if (!to || typeof to !== "string") {
      throw new HttpsError("invalid-argument", "A recipient phone number is required.");
    }
    if (!body || typeof body !== "string" || body.length > 1600) {
      throw new HttpsError("invalid-argument", "SMS body must be 1–1600 characters.");
    }

    try {
      const client = await getTwilioClient();
      const message = await client.messages.create({
        body,
        from: getTwilioFromNumber(),
        to,
      });
      logger.info(`SMS sent to ${to}: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (err: any) {
      logger.error("Twilio SMS failed:", err.message);
      throw new HttpsError("internal", `SMS failed: ${err.message}`);
    }
  }
);

// ── onRoverOffline — SMS notification when rover goes offline ────
export const onRoverOffline = onValueUpdated(
  "/users/{uid}/devices/{deviceId}/status",
  async (event) => {
    const uid = event.params.uid;
    const deviceId = event.params.deviceId;
    const before = event.data.before.val();
    const after = event.data.after.val();

    // Only trigger on transition from live/stale → offline
    if (before === after) return;
    if (after !== "offline") return;
    if (before !== "live" && before !== "stale") return;

    // SMS cooldown check
    const cooldownKey = `lastSmsOffline_${deviceId}`;
    const cooldownSnap = await db
      .ref(`_cooldowns/${uid}/${cooldownKey}`)
      .get();
    const lastSms = cooldownSnap.val() ?? 0;
    if (Date.now() - lastSms < SMS_COOLDOWN_MS) return;
    await db.ref(`_cooldowns/${uid}/${cooldownKey}`).set(Date.now());

    // Get user's phone number
    const phoneSnap = await db.ref(`users/${uid}/phoneNumber`).get();
    const phoneNumber = phoneSnap.val();
    if (!phoneNumber) {
      logger.info(`No phone number for ${uid}, skipping SMS for rover offline.`);
      return;
    }

    // Get Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      logger.warn("Twilio env vars not set, skipping SMS.");
      return;
    }

    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `🚨 FarmAssist Alert: Rover "${deviceId}" has gone offline. Please check power and WiFi connection.`,
        from: fromNumber,
        to: phoneNumber,
      });
      logger.info(`Offline SMS sent to ${phoneNumber} for rover ${deviceId}`);
    } catch (err: any) {
      logger.error(`Offline SMS failed for ${uid}:`, err.message);
    }
  }
);