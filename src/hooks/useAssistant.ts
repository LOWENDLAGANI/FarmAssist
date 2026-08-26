/**
 * useAssistant.ts
 * ─────────────────────────────────────────────────────────────────
 * Chat state machine for the in-app AI assistant.
 *
 * Talks to the `askAssistant` Firebase Callable Function, which
 * proxies Gemini server-side (API key never reaches the browser).
 * Conversation history is kept in memory for the session; the last
 * turns are sent along so Gemini has context.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebaseConfig";
import { useAuth } from "@/components/AuthProvider";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

/** How many previous turns to send for conversational context. */
const HISTORY_WINDOW = 8;

let nextId = 0;
const makeId = () => `msg_${Date.now()}_${nextId++}`;

/** Map callable-function errors to friendly copy. */
function errorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "functions/unauthenticated":
      return "Sign in with your account to chat with me! 🌱";
    case "functions/resource-exhausted":
      return "You're sending messages a little too fast — give me a few seconds! 😊";
    case "functions/failed-precondition":
      return "I'm not set up on the server yet. Ask your admin to deploy the assistant function.";
    case "functions/unavailable":
    case "functions/not-found":
    case "functions/internal":
      return "Hmm, I couldn't reach the server just now. Please try again in a moment.";
    default:
      return "Something went wrong on my end. Mind trying that again?";
  }
}

export function useAssistant() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  // Guards against double-sends while awaiting the callable.
  const sendingRef = useRef(false);
  // Mirror of `messages` so send() can read history without stale closures.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sendingRef.current || isTyping) return;
      sendingRef.current = true;

      const userMsg: ChatMessage = { id: makeId(), role: "user", text };
      setMessages((prev) => [...prev, userMsg]);

      // Not signed in: reply locally without calling the function.
      // Guest demo sessions count as signed-in users for the widget.
      if (!user && !loading) {
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: makeId(),
              role: "assistant",
              text: "Hi there! 🌱 Sign in with your FarmAssist account and I'll be happy to help.",
            },
          ]);
          setIsTyping(false);
          sendingRef.current = false;
        }, 400);
        return;
      }

      const history = messagesRef.current
        .filter((m) => !m.id.startsWith("err_"))
        .slice(-HISTORY_WINDOW)
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          text: m.text,
        }));

      setIsTyping(true);
      try {
        const functions = getFunctions(app);
        const callable = httpsCallable<
          { message: string; history: typeof history },
          { reply: string }
        >(functions, "askAssistant");
        const result = await callable({ message: text, history });
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "assistant", text: result.data.reply },
        ]);
      } catch (err) {
        console.error("askAssistant failed:", err);
        setMessages((prev) => [
          ...prev,
          { id: `err_${makeId()}`, role: "assistant", text: errorMessage(err) },
        ]);
      } finally {
        setIsTyping(false);
        sendingRef.current = false;
      }
    },
    [user, loading, isTyping]
  );

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isTyping, send, clearChat, authReady: !loading, signedIn: !!user };
}
