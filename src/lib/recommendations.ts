/**
 * recommendations.ts
 * ─────────────────────────────────────────────────────────────────
 * Client-side heuristic rule engine that evaluates incoming sensor
 * telemetry in real time and produces actionable recommendations.
 *
 * No AI model or external API call — rules are deterministic
 * thresholds derived from agronomy best-practice ranges.
 *
 * Supports user-configurable thresholds via the SensorRanges parameter.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SensorTelemetry, SensorKey, Recommendation } from "@/types/telemetry";
import type { SensorRanges } from "@/hooks/useSensorRanges";

// ── Default threshold constants (fallback if no user config) ─────
const DEFAULT_THRESHOLDS = {
  temperature: {
    low: 5,      // Below 5°C — frost risk
    high: 32,    // Above 32°C — heat stress
    critical: 38,
  },
  light: {
    low: 500,    // Below 500 lux — too dark for most crops
    high: 9000,  // Above 9000 lux — potential heat/light stress
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
 * Builds threshold config from user-configurable ranges.
 * The user configures "optimal" range; we derive warning/critical
 * thresholds from those values (anything outside optimal = warning).
 */
function buildThresholds(ranges?: SensorRanges) {
  if (!ranges) return DEFAULT_THRESHOLDS;

  return {
    temperature: {
      low: ranges.temperature.optimalMin - 13, // ~5°C default
      high: ranges.temperature.optimalMax + 2,  // ~32°C default
      critical: ranges.temperature.optimalMax + 8, // ~38°C default
    },
    light: {
      low: ranges.light.optimalMin > 500 ? ranges.light.optimalMin : 500,
      high: ranges.light.optimalMax < 9000 ? ranges.light.optimalMax : 9000,
    },
    moisture: {
      low: ranges.moisture.optimalMin,
      high: ranges.moisture.optimalMax + 20,
    },
    waterLevel: {
      low: ranges.waterLevel.optimalMin > 15 ? ranges.waterLevel.optimalMin : 15,
      critical: 5,
    },
  };
}

/**
 * Evaluates the latest telemetry snapshot against the threshold
 * rules and returns an array of actionable recommendations.
 *
 * @param data   - The most recent sensor reading from RTDB
 * @param ranges - Optional user-configurable ranges from Firebase
 * @returns      - Array of recommendations (may be empty if all readings are optimal)
 */
export function generateRecommendations(
  data: SensorTelemetry,
  ranges?: SensorRanges
): Recommendation[] {
  const THRESHOLDS = buildThresholds(ranges);
  const recs: Recommendation[] = [];
  const t = data.temperature;
  const l = data.light;
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

  // ── Light ────────────────────────────────────────────────────
  if (l > THRESHOLDS.light.high) {
    recs.push(
      makeRec(
        "light",
        "warning",
        `Very high light intensity (${l.toFixed(0)} lux) — risk of leaf scorch. Provide shade.`,
        "Sun"
      )
    );
  } else if (l < THRESHOLDS.light.low) {
    recs.push(
      makeRec(
        "light",
        "info",
        `Low light level (${l.toFixed(0)} lux) — crops may need more sunlight.`,
        "Sun"
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
