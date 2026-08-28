/**
 * useSms.ts
 * ─────────────────────────────────────────────────────────────────
 * Hook for managing SMS notifications via Twilio Cloud Functions.
 *
 *  • savePhoneNumber — stores phone number in Firebase RTDB
 *  • sendTestSms     — calls the sendSms callable function
 *  • phoneNumber     — current phone number from Firebase
 *
 * SMS is ONLY sent for rover-offline events (handled server-side).
 * This hook is for the test button and phone number management.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDatabase, ref, set, onValue } from "firebase/database";

const OWNER_UID = "tsYo3zKfr8SSowOE23lPQe8Kb0v2";

interface SendSmsResult {
  success: boolean;
  sid: string;
}

export function useSms(userId: string) {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const isOwner = userId === OWNER_UID;
  // Callable Functions are deployed in Singapore, not the SDK default us-central1.
  const functions = getFunctions(undefined, "asia-southeast1");
  const db = getDatabase();

  // ── Load phone number from Firebase ──────────────────────────
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const phoneRef = ref(db, `users/${userId}/phoneNumber`);
    const unsubscribe = onValue(phoneRef, (snap) => {
      setPhoneNumber(snap.val() ?? "");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, db]);

  // ── Save phone number to Firebase ────────────────────────────
  const savePhoneNumber = useCallback(
    async (number: string) => {
      if (!userId || !isOwner) return;
      const phoneRef = ref(db, `users/${userId}/phoneNumber`);
      await set(phoneRef, number || null);
      setPhoneNumber(number);
    },
    [userId, isOwner, db]
  );

  // ── Send test SMS ────────────────────────────────────────────
  const sendTestSms = useCallback(async () => {
    if (!isOwner || !phoneNumber) return;

    setSending(true);
    setSendResult(null);

    try {
      const sendSmsFn = httpsCallable<{ to: string; body: string }, SendSmsResult>(
        functions,
        "sendSms"
      );

      const result = await sendSmsFn({
        to: phoneNumber,
        body: "✅ FarmAssist SMS test successful! You will receive alerts when your Rover goes offline.",
      });

      setSendResult({
        success: true,
        message: `SMS sent successfully (${result.data.sid})`,
      });
    } catch (err: any) {
      const message = err?.message || "Failed to send SMS";
      setSendResult({ success: false, message });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  }, [isOwner, phoneNumber, functions]);

  return {
    phoneNumber,
    loading,
    saving: false,
    isOwner,
    sendTestSms,
    sending,
    sendResult,
    savePhoneNumber,
  };
}
