"use strict";
/**
 * Firebase Cloud Functions — FarmAssist Push Notifications
 * ─────────────────────────────────────────────────────────────────
 * Server-side functions that send FCM push notifications for
 * critical events. These run even when the user's browser is closed.
 *
 * Functions:
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
exports.onForcePair = exports.onSensorAlert = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
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
//# sourceMappingURL=index.js.map