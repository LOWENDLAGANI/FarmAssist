/**
 * notificationSound.ts
 * ─────────────────────────────────────────────────────────────────
 * Utility for playing notification sounds and haptic feedback.
 *
 * Sound preferences are stored in localStorage and can be toggled
 * from the Settings page.
 * ─────────────────────────────────────────────────────────────────
 */

const SOUND_PREF_KEY = "farmassist-notification-sound";
const VIBRATE_PREF_KEY = "farmassist-haptic-feedback";

/** Check if notification sounds are enabled. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_PREF_KEY);
  return stored !== "false"; // Default to true
}

/** Toggle notification sounds on/off. */
export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

/** Check if haptic feedback is enabled. */
export function isHapticEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(VIBRATE_PREF_KEY);
  return stored !== "false"; // Default to true
}

/** Toggle haptic feedback on/off. */
export function setHapticEnabled(enabled: boolean): void {
  localStorage.setItem(VIBRATE_PREF_KEY, String(enabled));
}

/**
 * Play a soft notification chime.
 * Uses the Web Audio API to generate a pleasant two-tone chime
 * without requiring any audio files.
 */
export function playNotificationSound(type: "info" | "warning" | "critical" = "info"): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = new AudioContext();

    // Different tones for different severity levels
    const tones: Record<string, Array<{ freq: number; delay: number; duration: number }>> = {
      info: [
        { freq: 523, delay: 0, duration: 0.12 },     // C5
        { freq: 659, delay: 0.1, duration: 0.15 },   // E5
      ],
      warning: [
        { freq: 440, delay: 0, duration: 0.1 },      // A4
        { freq: 554, delay: 0.08, duration: 0.1 },   // C#5
        { freq: 659, delay: 0.16, duration: 0.15 },  // E5
      ],
      critical: [
        { freq: 659, delay: 0, duration: 0.08 },     // E5
        { freq: 880, delay: 0.06, duration: 0.08 },  // A5
        { freq: 1047, delay: 0.12, duration: 0.2 },  // C6
      ],
    };

    const notes = tones[type] ?? tones.info;
    const volume = type === "critical" ? 0.3 : 0.2;

    notes.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.01);
    });
  } catch {
    // Audio not available — silently skip
  }
}

/**
 * Trigger haptic feedback via the Vibration API.
 * Different patterns for different severity levels.
 */
export function triggerHaptic(type: "info" | "warning" | "critical" = "info"): void {
  if (!isHapticEnabled()) return;
  if (!("vibrate" in navigator)) return;

  const patterns: Record<string, number[]> = {
    info: [10],
    warning: [20, 30, 20],
    critical: [50, 20, 50, 20, 100],
  };

  try {
    navigator.vibrate(patterns[type] ?? patterns.info);
  } catch {
    // Vibration not supported
  }
}

/**
 * Combined alert: play sound + haptic feedback.
 * Call this for critical events like empty water tank.
 */
export function alertUser(type: "info" | "warning" | "critical" = "info"): void {
  playNotificationSound(type);
  triggerHaptic(type);
}
