"use strict";
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
const app_1 = require("firebase-admin/app");
const database_1 = require("firebase-admin/database");
const messaging_1 = require("firebase-admin/messaging");
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const database_2 = require("firebase-functions/v2/database");
const logger = __importStar(require("firebase-functions/logger"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, app_1.initializeApp)();
const db = (0, database_1.getDatabase)();
const messaging = (0, messaging_1.getMessaging)();
// Set Asia server (Singapore) globally for all v2 functions
(0, v2_1.setGlobalOptions)({ region: "asia-southeast1" });
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
// Lazy-load cached system prompt to prevent top-level initialization timeouts
let cachedSystemPrompt = null;
function getSystemPrompt() {
    if (!cachedSystemPrompt) {
        try {
            const promptPath = path.join(__dirname, "..", "systemPrompt.txt");
            cachedSystemPrompt = fs.readFileSync(promptPath, "utf-8");
        }
        catch (err) {
            logger.error("Failed to read systemPrompt.txt:", err);
            cachedSystemPrompt = "You are a helpful assistant for FarmAssist.";
        }
    }
    return cachedSystemPrompt;
}
// ── Sensor threshold alert ──────────────────────────────────────
exports.onSensorAlert = (0, database_2.onValueWritten)("/users/{uid}/devices/{deviceId}/latest", async (event) => {
    var _a;
    const uid = event.params.uid;
    const deviceId = event.params.deviceId;
    const data = event.data.after.val();
    if (!data)
        return;
    const rangesSnap = await db
        .ref(`users/${uid}/devices/${deviceId}/ranges`)
        .get();
    const ranges = rangesSnap.val();
    if (!ranges)
        return;
    const tokenSnap = await db.ref(`users/${uid}/fcmToken`).get();
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
        .get();
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
        logger.info(`Push sent to ${uid} for ${deviceId}`);
    }
    catch (err) {
        if (err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token") {
            await db.ref(`users/${uid}/fcmToken`).remove();
            logger.warn(`Removed stale FCM token for ${uid}`);
        }
        else {
            logger.error("Push send failed:", err);
        }
    }
});
// ── Force-pair alert ────────────────────────────────────────────
exports.onForcePair = (0, database_2.onValueUpdated)("/rover_registry/{deviceId}", async (event) => {
    const deviceId = event.params.deviceId;
    const before = event.data.before.val();
    const after = event.data.after.val();
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
        .get();
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
        logger.info(`Force-pair push sent to ${prevOwnerUid}`);
    }
    catch (err) {
        if (err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token") {
            await db.ref(`users/${prevOwnerUid}/fcmToken`).remove();
        }
        else {
            logger.error("Force-pair push failed:", err);
        }
    }
});
// ── AI Help Assistant (Gemini) ──────────────────────────────────
const ASSISTANT_RATE_LIMIT = { maxCalls: 20, windowMs: 60 * 1000 };
const assistantRateMap = new Map();
exports.askAssistant = (0, https_1.onCall)({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
    var _a, _b, _c, _d;
    var _e, _f;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to chat with the assistant.");
    }
    const uid = request.auth.uid;
    const data = request.data;
    const message = typeof (data === null || data === void 0 ? void 0 : data.message) === "string" ? data.message.trim() : "";
    if (!message || message.length > 1000) {
        throw new https_1.HttpsError("invalid-argument", "Message must be between 1 and 1000 characters.");
    }
    const history = Array.isArray(data === null || data === void 0 ? void 0 : data.history)
        ? data.history
            .filter((t) => !!t &&
            typeof t.text === "string" &&
            (t.role === "user" ||
                t.role === "model"))
            .slice(-12)
            .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }))
        : [];
    const now = Date.now();
    const stamps = ((_e = assistantRateMap.get(uid)) !== null && _e !== void 0 ? _e : []).filter((t) => now - t < ASSISTANT_RATE_LIMIT.windowMs);
    if (stamps.length >= ASSISTANT_RATE_LIMIT.maxCalls) {
        throw new https_1.HttpsError("resource-exhausted", "You're sending messages too fast — take a short breather! 🌱");
    }
    stamps.push(now);
    assistantRateMap.set(uid, stamps);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error("GEMINI_API_KEY secret is not set");
        throw new https_1.HttpsError("failed-precondition", "The assistant isn't configured yet. Try again later.");
    }
    const systemPrompt = getSystemPrompt();
    const model = (_f = process.env.GEMINI_MODEL) !== null && _f !== void 0 ? _f : "gemini-3.5-flash-lite";
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
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 512,
                },
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            logger.error(`Gemini HTTP ${res.status} for model ${model}. Body: ${body}`);
            throw new Error(`Gemini responded ${res.status}`);
        }
        const json = (await res.json());
        reply = (_d = (_c = (_b = (_a = json.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.map((p) => { var _a; return (_a = p.text) !== null && _a !== void 0 ? _a : ""; }).join("").trim();
    }
    catch (err) {
        logger.error("Gemini call failed:", err);
        throw new https_1.HttpsError("internal", "The assistant had trouble responding. Please try again.");
    }
    if (!reply) {
        throw new https_1.HttpsError("internal", "The assistant couldn't generate a reply. Please try rephrasing.");
    }
    return { reply };
});
//# sourceMappingURL=index.js.map