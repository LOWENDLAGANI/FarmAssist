/**
 * recommendations.ts
 * ─────────────────────────────────────────────────────────────────
 * Client-side heuristic rule engine that evaluates incoming sensor
 * telemetry in real time and produces actionable recommendations.
 *
 * No AI model or external API call — rules are deterministic
 * thresholds derived from agronomy best-practice ranges.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SensorTelemetry, SensorKey, Recommendation } from "@/types/telemetry";

// ── Threshold constants ───────────────────────────────────────────
const THRESHOLDS = {
  temperature: {
    low: 5,      // Below 5°C — frost risk
    high: 32,    // Above 32°C — heat stress
    critical: 38,
  },
  humidity: {
    low: 20,     // Below 20% — air too dry
    high: 85,    // Above 85% — fungal disease risk
  },
  moisture: {
    low: 30,     // Below 30% — needs irrigation
    high: 80,    // Above 80% — overwatered / waterlogged
  },
  waterLevel: {
    low: 15,     // Below 15% — refill reservoir
    critical: 5, // Below 5% — empty
  },
};

let recommendationIdCounter = 0;

function makeRec(
  sensor: SensorKey,
  severity: "info" | "warning" | "critical",
  message: string,
  icon: string
): Recommendation {
  return {
    id: `rec-${++recommendationIdCounter}-${Date.now()}`,
    severity,
    sensor,
    message,
    icon,
  };
}

/**
 * Evaluates the latest telemetry snapshot against the threshold
 * rules and returns an array of actionable recommendations.
 *
 * @param data - The most recent sensor reading from Firestore
 * @returns    - Array of recommendations (may be empty if all readings are optimal)
 */
export function generateRecommendations(
  data: SensorTelemetry
): Recommendation[] {
  const recs: Recommendation[] = [];
  const t = data.temperature;
  const h = data.humidity;
  const m = data.moisture;
  const w = data.waterLevel;

  // ── Temperature ──────────────────────────────────────────────
  if (t >= THRESHOLDS.temperature.critical) {
    recs.push(
      makeRec(
        "temperature",
        "critical",
        `Extreme heat alert: ${t.toFixed(1)}°C — irrigate and provide shade immediately.`,
        "AlertTriangle"
      )
    );
  } else if (t > THRESHOLDS.temperature.high) {
    recs.push(
      makeRec(
        "temperature",
        "warning",
        `High temperature (${t.toFixed(1)}°C) — monitor crops for heat stress.`,
        "Thermometer"
      )
    );
  } else if (t < THRESHOLDS.temperature.low) {
    recs.push(
      makeRec(
        "temperature",
        "warning",
        `Low temperature (${t.toFixed(1)}°C) — risk of frost. Consider protective measures.`,
        "Snowflake"
      )
    );
  }

  // ── Humidity ─────────────────────────────────────────────────
  if (h > THRESHOLDS.humidity.high) {
    recs.push(
      makeRec(
        "humidity",
        "warning",
        `High air humidity (${h.toFixed(0)}%) — increased risk of fungal disease.`,
        "Droplets"
      )
    );
  } else if (h < THRESHOLDS.humidity.low) {
    recs.push(
      makeRec(
        "humidity",
        "info",
        `Low humidity (${h.toFixed(0)}%) — air is dry, consider misting.`,
        "Wind"
      )
    );
  }

  // ── Soil Moisture ────────────────────────────────────────────
  if (m < THRESHOLDS.moisture.low) {
    recs.push(
      makeRec(
        "moisture",
        "warning",
        `Soil moisture is low (${m.toFixed(0)}%) — trigger irrigation.`,
        "Sprout"
      )
    );
  } else if (m > THRESHOLDS.moisture.high) {
    recs.push(
      makeRec(
        "moisture",
        "warning",
        `Soil is saturated (${m.toFixed(0)}%) — pause irrigation, check drainage.`,
        "Droplets"
      )
    );
  } else {
    recs.push(
      makeRec(
        "moisture",
        "info",
        `Soil moisture is optimal (${m.toFixed(0)}%) — no action needed.`,
        "Sprout"
      )
    );
  }

  // ── Water Level ──────────────────────────────────────────────
  if (w < THRESHOLDS.waterLevel.critical) {
    recs.push(
      makeRec(
        "waterLevel",
        "critical",
        `Reservoir critically low (${w.toFixed(0)}%) — refill immediately.`,
        "AlertTriangle"
      )
    );
  } else if (w < THRESHOLDS.waterLevel.low) {
    recs.push(
      makeRec(
        "waterLevel",
        "warning",
        `Water level is low (${w.toFixed(0)}%) — plan to refill the reservoir soon.`,
        "Waves"
      )
    );
  } else {
    recs.push(
      makeRec(
        "waterLevel",
        "info",
        `Reservoir level is healthy (${w.toFixed(0)}%).`,
        "Waves"
      )
    );
  }

  return recs;
}
