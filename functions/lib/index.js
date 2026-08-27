"use strict";
/**
 * Firebase Cloud Functions — FarmAssist Push Notifications
 * ─────────────────────────────────────────────────────────────────
 * Server-side functions that send FCM push notifications for
 * critical events. These run even when the user's browser is closed.
 *
 * Functions:
 *  • askAssistant   — callable; Gemini-powered in-app help assistant
 *  • onSensorAlert  — triggers on telemetry write, checks thresholds
 *  • onForcePair    — triggers on rover_registry update
 * ─────────────────────────────────────────────────────────────────
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAssistant = exports.onForcePair = exports.onSensorAlert = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
admin.initializeApp();
const db = admin.database();
const messaging = admin.messaging();
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
// ── Sensor threshold alert ──────────────────────────────────────
exports.onSensorAlert = functions.database
    .ref("/users/{uid}/devices/{deviceId}/latest")
    .onWrite(async (change, context) => {
    var _a;
    const uid = context.params.uid;
    const deviceId = context.params.deviceId;
    const data = change.after.val();
    if (!data)
        return;
    const rangesSnap = await db
        .ref(`users/${uid}/devices/${deviceId}/ranges`)
        .once("value");
    const ranges = rangesSnap.val();
    if (!ranges)
        return;
    const tokenSnap = await db.ref(`users/${uid}/fcmToken`).once("value");
    const tokenData = tokenSnap.val();
    if (!(tokenData === null || tokenData === void 0 ? void 0 : tokenData.token))
        return;
    const alerts = [];
    const checks = [
        { key: "temperature", label: "Temperature", unit: "°C", value: data.temperature },
        { key: "moisture", label: "Soil Moisture", unit: "%", value: data.moisture },
        { key: "waterLevel", label: "Water Level", unit: "%", value: data.waterLevel },
        { key: "light", label: "Light", unit: "lux", value: data.light },
    ];
    for (const { key, label, unit, value } of checks) {
        if (typeof value !== "number")
            continue;
        const range = ranges[key];
        if (!range)
            continue;
        if (value > range.optimalMax) {
            alerts.push(`${label} is ${value}${unit} (max: ${range.optimalMax}${unit})`);
        }
        else if (value < range.optimalMin) {
            alerts.push(`${label} is ${value}${unit} (min: ${range.optimalMin}${unit})`);
        }
    }
    if (alerts.length === 0)
        return;
    const cooldownKey = `lastAlert_${deviceId}`;
    const cooldownSnap = await db
        .ref(`_cooldowns/${uid}/${cooldownKey}`)
        .once("value");
    const lastAlert = (_a = cooldownSnap.val()) !== null && _a !== void 0 ? _a : 0;
    if (Date.now() - lastAlert < ALERT_COOLDOWN_MS)
        return;
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
        functions.logger.info(`Push sent to ${uid} for ${deviceId}`);
    }
    catch (err) {
        if (err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token") {
            await db.ref(`users/${uid}/fcmToken`).remove();
            functions.logger.warn(`Removed stale FCM token for ${uid}`);
        }
        else {
            functions.logger.error("Push send failed:", err);
        }
    }
});
// ── Force-pair alert ────────────────────────────────────────────
exports.onForcePair = functions.database
    .ref("/rover_registry/{deviceId}")
    .onUpdate(async (change, context) => {
    const deviceId = context.params.deviceId;
    const before = change.before.val();
    const after = change.after.val();
    if (!before || !after)
        return;
    if (before.ownerUid === after.ownerUid)
        return;
    if (!before.ownerUid)
        return;
    const prevOwnerUid = before.ownerUid;
    if (before.paired === false && after.paired === true)
        return;
    const tokenSnap = await db
        .ref(`users/${prevOwnerUid}/fcmToken`)
        .once("value");
    const tokenData = tokenSnap.val();
    if (!(tokenData === null || tokenData === void 0 ? void 0 : tokenData.token))
        return;
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
        functions.logger.info(`Force-pair push sent to ${prevOwnerUid}`);
    }
    catch (err) {
        if (err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token") {
            await db.ref(`users/${prevOwnerUid}/fcmToken`).remove();
        }
        else {
            functions.logger.error("Force-pair push failed:", err);
        }
    }
});
// ── AI Help Assistant (Gemini) ──────────────────────────────────
/**
 * Callable function that powers the in-app assistant widget.
 * Requires the `GEMINI_API_KEY` secret:
 *   firebase functions:secrets:set GEMINI_API_KEY
 *
 * Request : { message: string, history?: { role: "user"|"model", text: string }[] }
 * Response: { reply: string }
 * Auth    : required (context.auth enforced below)
 */
/** Load the system prompt from functions/systemPrompt.txt.
 *  __dirname = functions/lib/ at runtime, so go up one level. */
const ASSISTANT_SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, "..", "systemPrompt.txt"), "utf-8");
/** Per-uid sliding-window rate limit to protect the Gemini quota. */
const ASSISTANT_RATE_LIMIT = { maxCalls: 20, windowMs: 60 * 1000 };
const assistantRateMap = new Map();
exports.askAssistant = functions
    .runWith({ secrets: ["GEMINI_API_KEY"] })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Sign in to chat with the assistant.");
    }
    const uid = context.auth.uid;
    const message = typeof (data === null || data === void 0 ? void 0 : data.message) === "string" ? data.message.trim() : "";
    if (!message || message.length > 1000) {
        throw new functions.https.HttpsError("invalid-argument", "Message must be between 1 and 1000 characters.");
    }
    // Sanitize caller-supplied history (max 12 turns).
    const history = Array.isArray(data === null || data === void 0 ? void 0 : data.history)
        ? data.history
            .filter((t) => !!t &&
            typeof t.text === "string" &&
            (t.role === "user" ||
                t.role === "model"))
            .slice(-12)
            .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }))
        : [];
    // Rate limit (per instance; sufficient as a soft guardrail).
    const now = Date.now();
    const stamps = ((_a = assistantRateMap.get(uid)) !== null && _a !== void 0 ? _a : []).filter((t) => now - t < ASSISTANT_RATE_LIMIT.windowMs);
    if (stamps.length >= ASSISTANT_RATE_LIMIT.maxCalls) {
        throw new functions.https.HttpsError("resource-exhausted", "You're sending messages too fast — take a short breather! 🌱");
    }
    stamps.push(now);
    assistantRateMap.set(uid, stamps);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        functions.logger.error("GEMINI_API_KEY secret is not set");
        throw new functions.https.HttpsError("failed-precondition", "The assistant isn't configured yet. Try again later.");
    }
    // gemini-2.0-flash was retired 2026-06-01; default to a stable,
    // cost-effective Flash-Lite. Override with the GEMINI_MODEL env var.
    const model = (_b = process.env.GEMINI_MODEL) !== null && _b !== void 0 ? _b : "gemini-3.5-flash-lite";
    const contents = [
        ...history.map((t) => ({
            role: t.role,
            parts: [{ text: t.text }],
        })),
        { role: "user", parts: [{ text: message }] },
    ];
    let reply;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: ASSISTANT_SYSTEM_PROMPT }] },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 512,
                },
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            functions.logger.error(`Gemini HTTP ${res.status} for model ${model}. If this is a 404, ` +
                `the model was retired or unavailable — set GEMINI_MODEL to a current ` +
                `model (see https://ai.google.dev/gemini-api/docs/models). Body: ${body}`);
            throw new Error(`Gemini responded ${res.status}`);
        }
        const json = (await res.json());
        reply = (_f = (_e = (_d = (_c = json.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f.map((p) => { var _a; return (_a = p.text) !== null && _a !== void 0 ? _a : ""; }).join("").trim();
    }
    catch (err) {
        functions.logger.error("Gemini call failed:", err);
        throw new functions.https.HttpsError("internal", "The assistant had trouble responding. Please try again.");
    }
    if (!reply) {
        throw new functions.https.HttpsError("internal", "The assistant couldn't generate a reply. Please try rephrasing.");
    }
    return { reply };
});
//# sourceMappingURL=index.js.map