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
exports.onRoverOffline = exports.sendSms = exports.askAssistant = exports.onSensorAlert = exports.unbanUser = exports.banUser = exports.searchUsers = exports.verifyInviteCode = exports.registerWithInvite = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
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
const SMS_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown for SMS
const OWNER_UID = "tsYo3zKfr8SSowOE23lPQe8Kb0v2";
// ── Invite-code registration ────────────────────────────────────
// Every new account must be unlocked with the single shared invite
// code stored in the database at `inviteCode/code` — UNLESS the
// admin has turned invite codes off by writing `inviteConfig/required`
// = false from the admin panel (open registration).
//
//   • Email/password accounts are ONLY created server-side by
//     `registerWithInvite`, which refuses to create the account when
//     the code is missing or wrong (invite-only mode). When invites
//     are off, any valid signup is accepted without a code.
//   • Google accounts are created by Google first (unavoidable), then
//     the app shows an unclosable popup that calls `verifyInviteCode`.
//     Until it succeeds, `users/{uid}/verified` stays unverified and
//     the popup keeps blocking the app. When invites are off the
//     popup becomes a one-tap Continue that unlocks the account.
//   • `blockDirectSignup` rejects client-side email/password signup so
//     nobody can bypass the invite code. (Admin SDK user creation does
//     NOT trigger blocking functions, which is why the callable path
//     still works.)
/** Normalize an invite code for comparison: trim + case-insensitive. */
function normalizeCode(raw) {
    return raw.trim().toLowerCase();
}
/** Read the single shared invite code from the database. */
async function getInviteCode() {
    const snap = await db.ref("inviteCode/code").get();
    const code = snap.val();
    return typeof code === "string" && code.trim() ? code : null;
}
/**
 * Whether registration currently requires the shared invite code.
 * The admin toggles this in the admin panel (`inviteConfig/required`).
 * When the flag is missing it defaults to true (invite-only), which
 * preserves the original behavior.
 */
async function isInviteRequired() {
    const snap = await db.ref("inviteConfig/required").get();
    return snap.val() !== false;
}
/**
 * Callable: creates an email/password account. When registration is
 * invite-only (the default), the account is created ONLY when the
 * invite code is valid — no account is created when the code is wrong.
 * When the admin has turned invite codes off (`inviteConfig/required`
 * is false), the code is optional and any valid signup is accepted.
 * The account is created with the Admin SDK and marked verified
 * immediately.
 *
 * (A beforeUserCreated blocking function would also block raw client
 * SDK signups, but it requires the project to be upgraded to Identity
 * Platform — GCIP — which this project doesn't use. Without it, anyone
 * who creates an account directly still gets locked behind the invite
 * popup because users/{uid}/verified is only settable by the server.)
 */
exports.registerWithInvite = (0, https_1.onCall)({}, async (request) => {
    var _a, _b, _c;
    const { email, password, displayName, inviteCode } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password : "";
    const cleanName = typeof displayName === "string" ? displayName.trim() : "";
    const cleanCode = typeof inviteCode === "string" ? inviteCode : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new https_1.HttpsError("invalid-argument", "Please enter a valid email address.");
    }
    if (cleanPassword.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "Your password needs at least 6 characters.");
    }
    if (!cleanName || cleanName.length > 60) {
        throw new https_1.HttpsError("invalid-argument", "Please enter your name.");
    }
    // Invite-only mode: the code is mandatory and must match the stored one.
    // Open mode (invite codes turned off in the admin panel): skip the check.
    const inviteRequired = await isInviteRequired();
    if (inviteRequired) {
        if (!cleanCode) {
            throw new https_1.HttpsError("invalid-argument", "An invite code is required to register.");
        }
        const storedCode = await getInviteCode();
        if (!storedCode) {
            throw new https_1.HttpsError("failed-precondition", "Invite registration isn't configured yet. Ask the owner to set an invite code.");
        }
        if (normalizeCode(cleanCode) !== normalizeCode(storedCode)) {
            throw new https_1.HttpsError("invalid-argument", "That invite code isn't valid. Registration is invite-only — ask the owner for the code.");
        }
    }
    let uid;
    try {
        const user = await (0, auth_1.getAuth)().createUser({
            email: cleanEmail,
            password: cleanPassword,
            displayName: cleanName,
        });
        uid = user.uid;
    }
    catch (err) {
        logger.error("registerWithInvite createUser failed:", (_c = (_b = err === null || err === void 0 ? void 0 : err.code) !== null && _b !== void 0 ? _b : err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : err);
        if ((err === null || err === void 0 ? void 0 : err.code) === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "An account with this email already exists.");
        }
        throw new https_1.HttpsError("internal", "Could not create your account right now. Please try again.");
    }
    // Unlock the app for this account (server-side only write).
    await db.ref(`users/${uid}/verified`).set(true);
    logger.info(`New invite-registered user: ${uid} (${cleanEmail})`);
    return { uid };
});
/**
 * Callable: verifies the invite code for an already-existing account
 * (used by the Google sign-up popup). The code is checked against the
 * single stored code; `users/{uid}/verified` is only written when the
 * code is correct. Wrong codes leave the account unverified.
 */
exports.verifyInviteCode = (0, https_1.onCall)({}, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to verify your invite code.");
    }
    const uid = request.auth.uid;
    const { inviteCode } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const cleanCode = typeof inviteCode === "string" ? inviteCode : "";
    // Open mode (admin turned invite codes off): no code needed — unlock
    // any signed-in account (including Google sign-ups that never had a
    // chance to enter a code).
    const inviteRequired = await isInviteRequired();
    if (!inviteRequired) {
        await db.ref(`users/${uid}/verified`).set(true);
        return { verified: true };
    }
    if (!cleanCode) {
        throw new https_1.HttpsError("invalid-argument", "Enter your invite code to continue.");
    }
    const storedCode = await getInviteCode();
    if (!storedCode) {
        throw new https_1.HttpsError("failed-precondition", "No invite code is set yet. Ask the owner to set one.");
    }
    if (normalizeCode(cleanCode) !== normalizeCode(storedCode)) {
        throw new https_1.HttpsError("permission-denied", "That invite code isn't correct. Ask the owner for the current code and try again.");
    }
    await db.ref(`users/${uid}/verified`).set(true);
    return { verified: true };
});
// ── User Bans (admin) ────────────────────────────────────────
// Ban records live at `bans/{uid}` in RTDB. Only these callables
// (which run with the Admin SDK and bypass rules) may write them —
// clients can read their own record (ban screen) but never write.
//
//   • searchUsers — admin-only; finds accounts by UID, email or
//     display name (the admin doesn't always know who a UID is).
//   • banUser     — admin-only; writes/updates `bans/{uid}` with a
//     reason + expiry (0 = permanent).
//   • unbanUser   — admin-only; removes `bans/{uid}` (reverts a ban).
const MAX_BAN_REASON = 500;
const MAX_BAN_DURATION_MS = 100 * 365 * 24 * 60 * 60 * 1000; // ~100 years
/**
 * Callable: admin-only user lookup. Searches Firebase Auth accounts
 * by UID, email, or display name (case-insensitive prefix/substring)
 * and returns the first batch of matches so the admin can pick the
 * right account before banning.
 */
exports.searchUsers = (0, https_1.onCall)({}, async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to search users.");
    }
    if (request.auth.uid !== OWNER_UID) {
        throw new https_1.HttpsError("permission-denied", "Only the owner can search users.");
    }
    const { query } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const q = typeof query === "string" ? query.trim().toLowerCase() : "";
    if (!q)
        return { users: [] };
    const users = [];
    // listUsers is paginated; scan up to ~10k accounts (an invite-only
    // app will be far smaller) and stop once we have enough matches.
    let pageToken;
    for (let page = 0; page < 10 && users.length < 25; page++) {
        const list = await (0, auth_1.getAuth)().listUsers(1000, pageToken);
        for (const u of list.users) {
            const uid = u.uid.toLowerCase();
            const email = ((_b = u.email) !== null && _b !== void 0 ? _b : "").toLowerCase();
            const name = ((_c = u.displayName) !== null && _c !== void 0 ? _c : "").toLowerCase();
            if (uid === q ||
                uid.startsWith(q) ||
                email === q ||
                email.includes(q) ||
                name === q ||
                name.includes(q)) {
                users.push({
                    uid: u.uid,
                    displayName: u.displayName,
                    email: u.email,
                    photoURL: u.photoURL,
                    disabled: u.disabled,
                });
                if (users.length >= 25)
                    break;
            }
        }
        pageToken = list.pageToken;
        if (!pageToken)
            break;
    }
    return { users };
});
/**
 * Callable: admin-only. Bans (or re-bans, updating the record) a user
 * with a required reason and a duration. The record stores a profile
 * snapshot (display name / email) so the admin panel stays readable.
 */
exports.banUser = (0, https_1.onCall)({}, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to ban users.");
    }
    if (request.auth.uid !== OWNER_UID) {
        throw new https_1.HttpsError("permission-denied", "Only the owner can ban users.");
    }
    const { uid, durationMs, reason } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const targetUid = typeof uid === "string" ? uid.trim() : "";
    const cleanReason = typeof reason === "string" ? reason.trim() : "";
    if (!targetUid) {
        throw new https_1.HttpsError("invalid-argument", "A user UID is required to ban.");
    }
    if (!cleanReason) {
        throw new https_1.HttpsError("invalid-argument", "Please provide a reason for the ban.");
    }
    if (cleanReason.length > MAX_BAN_REASON) {
        throw new https_1.HttpsError("invalid-argument", `The reason must be under ${MAX_BAN_REASON} characters.`);
    }
    if (typeof durationMs !== "number" ||
        !Number.isFinite(durationMs) ||
        durationMs < 0) {
        throw new https_1.HttpsError("invalid-argument", "Please choose how long the ban should last.");
    }
    if (durationMs > MAX_BAN_DURATION_MS) {
        throw new https_1.HttpsError("invalid-argument", "That ban duration is too long.");
    }
    if (targetUid === OWNER_UID) {
        throw new https_1.HttpsError("invalid-argument", "You can't ban the admin account.");
    }
    let userRecord;
    try {
        userRecord = await (0, auth_1.getAuth)().getUser(targetUid);
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", "No account has that UID. Double-check the UID and try again.");
        }
        logger.error("banUser getUser failed:", (_c = (_b = err === null || err === void 0 ? void 0 : err.code) !== null && _b !== void 0 ? _b : err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : err);
        throw new https_1.HttpsError("internal", "Couldn't look up that account. Please try again.");
    }
    const now = Date.now();
    const record = {
        uid: targetUid,
        displayName: (_d = userRecord.displayName) !== null && _d !== void 0 ? _d : null,
        email: (_e = userRecord.email) !== null && _e !== void 0 ? _e : null,
        photoURL: (_f = userRecord.photoURL) !== null && _f !== void 0 ? _f : null,
        reason: cleanReason,
        bannedAt: now,
        // 0 = permanent; otherwise the timestamp the ban lifts.
        expiresAt: durationMs === 0 ? 0 : now + durationMs,
        bannedBy: request.auth.uid,
    };
    await db.ref(`bans/${targetUid}`).set(record);
    logger.info(`Banned ${targetUid} (${(_g = record.email) !== null && _g !== void 0 ? _g : "no email"}) ${durationMs === 0
        ? "permanently"
        : `until ${new Date(record.expiresAt).toISOString()}`}: ${cleanReason}`);
    return { banned: true, ban: record };
});
/**
 * Callable: admin-only. Removes a user's ban record, instantly
 * lifting the ban (the user's app re-checks bans/{uid} in real time).
 */
exports.unbanUser = (0, https_1.onCall)({}, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to unban users.");
    }
    if (request.auth.uid !== OWNER_UID) {
        throw new https_1.HttpsError("permission-denied", "Only the owner can unban users.");
    }
    const { uid } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const targetUid = typeof uid === "string" ? uid.trim() : "";
    if (!targetUid) {
        throw new https_1.HttpsError("invalid-argument", "A user UID is required to unban.");
    }
    await db.ref(`bans/${targetUid}`).remove();
    logger.info(`Unbanned ${targetUid}`);
    return { unbanned: true };
});
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
// ── AI Help Assistant (Gemini) ──────────────────────────────────
const ASSISTANT_RATE_LIMIT = { maxCalls: 20, windowMs: 60 * 1000 };
const assistantRateMap = new Map();
exports.askAssistant = (0, https_1.onCall)({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    var _h, _j, _k, _l;
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
    const stamps = ((_h = assistantRateMap.get(uid)) !== null && _h !== void 0 ? _h : []).filter((t) => now - t < ASSISTANT_RATE_LIMIT.windowMs);
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
    const model = (_j = process.env.GEMINI_MODEL) !== null && _j !== void 0 ? _j : "gemini-3.5-flash-lite";
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
        logger.info("Gemini response:", JSON.stringify({
            hasCandidates: !!((_a = json.candidates) === null || _a === void 0 ? void 0 : _a.length),
            promptFeedback: json.promptFeedback,
            candidateCount: (_k = (_b = json.candidates) === null || _b === void 0 ? void 0 : _b.length) !== null && _k !== void 0 ? _k : 0,
        }));
        if ((_c = json.promptFeedback) === null || _c === void 0 ? void 0 : _c.blockReason) {
            logger.error("Gemini blocked prompt:", json.promptFeedback.blockReason);
            throw new https_1.HttpsError("internal", "I couldn't respond to that — it may have been flagged by content filters.");
        }
        reply = (_g = (_f = (_e = (_d = json.candidates) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.content) === null || _f === void 0 ? void 0 : _f.parts) === null || _g === void 0 ? void 0 : _g.map((p) => { var _a; return (_a = p.text) !== null && _a !== void 0 ? _a : ""; }).join("").trim();
    }
    catch (err) {
        logger.error("Gemini call failed:", (_l = err === null || err === void 0 ? void 0 : err.message) !== null && _l !== void 0 ? _l : err);
        throw new https_1.HttpsError("internal", "The assistant had trouble responding. Please try again.");
    }
    if (!reply) {
        throw new https_1.HttpsError("internal", "The assistant couldn't generate a reply. Please try rephrasing.");
    }
    return { reply };
});
// ── Twilio SMS Helper ────────────────────────────────────────────
async function getTwilioClient() {
    const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
        throw new https_1.HttpsError("failed-precondition", "SMS service is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
    }
    return twilio(accountSid, authToken);
}
function getTwilioFromNumber() {
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) {
        throw new https_1.HttpsError("failed-precondition", "SMS service is not configured. Set TWILIO_PHONE_NUMBER.");
    }
    return from;
}
// ── sendSms — callable; sends a test SMS ─────────────────────────
exports.sendSms = (0, https_1.onCall)({}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to send SMS.");
    }
    // Only allow the owner to send test SMS
    if (request.auth.uid !== OWNER_UID) {
        throw new https_1.HttpsError("permission-denied", "Only the owner can send test SMS.");
    }
    const { to, body } = request.data;
    if (!to || typeof to !== "string") {
        throw new https_1.HttpsError("invalid-argument", "A recipient phone number is required.");
    }
    if (!body || typeof body !== "string" || body.length > 1600) {
        throw new https_1.HttpsError("invalid-argument", "SMS body must be 1–1600 characters.");
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
    }
    catch (err) {
        logger.error("Twilio SMS failed:", err.message);
        throw new https_1.HttpsError("internal", `SMS failed: ${err.message}`);
    }
});
// ── onRoverOffline — SMS notification when rover goes offline ────
exports.onRoverOffline = (0, database_2.onValueUpdated)("/users/{uid}/devices/{deviceId}/status", async (event) => {
    var _a;
    const uid = event.params.uid;
    const deviceId = event.params.deviceId;
    const before = event.data.before.val();
    const after = event.data.after.val();
    // Only trigger on transition from live/stale → offline
    if (before === after)
        return;
    if (after !== "offline")
        return;
    if (before !== "live" && before !== "stale")
        return;
    // SMS cooldown check
    const cooldownKey = `lastSmsOffline_${deviceId}`;
    const cooldownSnap = await db
        .ref(`_cooldowns/${uid}/${cooldownKey}`)
        .get();
    const lastSms = (_a = cooldownSnap.val()) !== null && _a !== void 0 ? _a : 0;
    if (Date.now() - lastSms < SMS_COOLDOWN_MS)
        return;
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
        const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default;
        const client = twilio(accountSid, authToken);
        await client.messages.create({
            body: "sms_delivery_notifications",
            from: fromNumber,
            to: phoneNumber,
            contentVariables: JSON.stringify({ "1": deviceId }),
        });
        logger.info(`Offline SMS sent to ${phoneNumber} for rover ${deviceId}`);
    }
    catch (err) {
        logger.error(`Offline SMS failed for ${uid}:`, err.message);
    }
});
//# sourceMappingURL=index.js.map