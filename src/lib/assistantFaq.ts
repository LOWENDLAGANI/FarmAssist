/**
 * assistantFaq.ts
 * ─────────────────────────────────────────────────────────────────
 * Quick-select FAQ chips shown in the assistant chat panel.
 * Tapping a chip sends its `question` to Gemini as a normal chat
 * message, exactly as if the user had typed it.
 *
 * To add/edit FAQs, just edit this list — no other code changes.
 * ─────────────────────────────────────────────────────────────────
 */

export interface AssistantFaq {
  /** Short label shown on the chip. */
  label: string;
  /** Full question sent to the assistant when tapped. */
  question: string;
}

export const ASSISTANT_FAQS: AssistantFaq[] = [
  {
    label: "Pair a Rover",
    question: "How do I pair a new Rover to my FarmAssist account?",
  },
  {
    label: "Sensor readings",
    question: "What do the sensor readings (temperature, moisture, water level, light) mean?",
  },
  {
    label: "Alerts & push",
    question: "How do alerts and push notifications work?",
  },
  {
    label: "Set sensor ranges",
    question: "How do I set optimal min/max ranges for my sensors?",
  },
  {
    label: "Rover offline",
    question: "My Rover shows as offline. How do I fix it?",
  },
  {
    label: "Change theme",
    question: "How do I change the dashboard theme?",
  },
];
