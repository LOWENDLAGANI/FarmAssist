/**
 * recommendations.ts
 * ─────────────────────────────────────────────────────────────────
 * Client-side heuristic rule engine that evaluates incoming sensor
 * telemetry in real time and produces detailed, AI-style analysis
 * with reasoning, action steps, and confidence scores.
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
  icon: string,
  analysis: string,
  actionSteps: string[],
  confidence: number
): Recommendation {
  return {
    id: `rec-${++recommendationIdCounter}-${Date.now()}`,
    severity,
    sensor,
    message,
    icon,
    analysis,
    actionSteps,
    confidence,
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
 * rules and returns an array of detailed AI-style recommendations.
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
        `Extreme heat alert: ${t.toFixed(1)}°C — immediate intervention required`,
        "AlertTriangle",
        `Your crops are currently experiencing extreme thermal stress at ${t.toFixed(1)}°C, which is well above the safe threshold of ${THRESHOLDS.temperature.critical}°C. At this temperature, enzyme activity in plant cells begins to denature, stomata close to conserve water, and photosynthesis slows dramatically. Prolonged exposure above 38°C can cause irreversible cellular damage, wilting, and crop yield loss of 30–50% depending on species.`,
        [
          "Activate the irrigation system immediately to cool the canopy through evaporative cooling",
          "Deploy shade covers or activate the shading mechanism on the rover",
          "Increase watering frequency to every 2–3 hours until temperature drops below 32°C",
          "Monitor for wilting, leaf curling, or discoloration in the next 30 minutes",
        ],
        95
      )
    );
  } else if (t > THRESHOLDS.temperature.high) {
    recs.push(
      makeRec(
        "temperature",
        "warning",
        `High temperature detected (${t.toFixed(1)}°C) — monitor for heat stress`,
        "Thermometer",
        `Temperature has risen to ${t.toFixed(1)}°C, exceeding the optimal growing range. While not yet critical, sustained exposure above ${THRESHOLDS.temperature.high}°C increases transpiration rates, causing plants to lose water faster than they can absorb it. This can lead to temporary wilting even if soil moisture is adequate, and may reduce fruit set in flowering crops.`,
        [
          "Increase irrigation frequency by 20–30% during peak heat hours",
          "Schedule watering for early morning (before 8 AM) or late evening (after 6 PM)",
          "Check soil moisture levels — high heat can mask drought conditions",
          "Consider temporary shade if temperatures remain elevated for more than 2 hours",
        ],
        85
      )
    );
  } else if (t < THRESHOLDS.temperature.low) {
    recs.push(
      makeRec(
        "temperature",
        "warning",
        `Low temperature detected (${t.toFixed(1)}°C) — frost risk`,
        "Snowflake",
        `Temperature has dropped to ${t.toFixed(1)}°C, approaching the frost danger zone below ${THRESHOLDS.temperature.low}°C. At these temperatures, ice crystals can form inside plant cells, rupturing cell walls and causing tissue death. Young seedlings and tropical varieties are especially vulnerable. Even brief frost exposure can destroy weeks of growth.`,
        [
          "Activate frost protection measures — covers, cloches, or fleece",
          "Run a light irrigation cycle — water releases heat as it freezes, protecting root zones",
          "Move sensitive plants to sheltered areas if possible",
          "Monitor temperature hourly — frost risk is highest between 2–6 AM",
        ],
        80
      )
    );
  } else {
    recs.push(
      makeRec(
        "temperature",
        "info",
        `Temperature is within optimal range (${t.toFixed(1)}°C)`,
        "Thermometer",
        `Current temperature of ${t.toFixed(1)}°C is well within the ideal growing range of ${THRESHOLDS.temperature.low}–${THRESHOLDS.temperature.high}°C. Plant metabolic processes, enzyme activity, and photosynthesis are all functioning at peak efficiency. No thermal stress or frost risk detected. Conditions are favorable for normal growth and development.`,
        [
          "Continue monitoring — temperature can shift rapidly with weather changes",
          "No immediate action required — maintain current irrigation schedule",
        ],
        98
      )
    );
  }

  // ── Light ────────────────────────────────────────────────────
  if (l > THRESHOLDS.light.high) {
    recs.push(
      makeRec(
        "light",
        "warning",
        `Excessive light intensity (${l.toFixed(0)} lux) — risk of leaf scorch`,
        "Sun",
        `Light intensity at ${l.toFixed(0)} lux exceeds the recommended maximum of ${THRESHOLDS.light.high} lux for most crop species. Excessive photosynthetically active radiation (PAR) can cause photoinhibition — where the photosynthetic apparatus becomes overwhelmed and generates reactive oxygen species (ROS) that damage cell membranes. This manifests as bleached or scorched leaf tips and reduced chlorophyll content.`,
        [
          "Deploy shade netting or activate automated shade mechanisms",
          "Ensure adequate irrigation — high light combined with low moisture accelerates leaf burn",
          "Monitor leaf color and texture for signs of photobleaching",
          "If growing light-sensitive varieties, consider temporary light diffusers",
        ],
        82
      )
    );
  } else if (l < THRESHOLDS.light.low) {
    recs.push(
      makeRec(
        "light",
        "info",
        `Low light conditions (${l.toFixed(0)} lux) — crops may need more sunlight`,
        "Sun",
        `Current light level of ${l.toFixed(0)} lux is below the ${THRESHOLDS.light.low} lux threshold needed for optimal photosynthesis in most crops. Low light reduces the rate of carbon fixation, leading to slower growth, elongated stems (etiolation), and pale or yellowing leaves. While not immediately harmful, prolonged low light can significantly delay harvest timelines and reduce yield weight.`,
        [
          "If using grow lights, ensure they are positioned at the correct height and duration",
          "Consider supplementing with artificial lighting during overcast periods",
          "Adjust planting layout to minimize shading between taller and shorter crops",
          "Monitor for signs of etiolation — stretched stems, small leaves, pale coloring",
        ],
        75
      )
    );
  }

  // ── Soil Moisture ────────────────────────────────────────────
  if (m < THRESHOLDS.moisture.low) {
    recs.push(
      makeRec(
        "moisture",
        "warning",
        `Soil moisture critically low (${m.toFixed(0)}%) — irrigation needed`,
        "Sprout",
        `Soil moisture has fallen to ${m.toFixed(0)}%, well below the optimal range. At this level, plant roots cannot extract water efficiently from soil particles due to increased matric potential. Plants respond by closing stomata to conserve water, which also halts CO₂ uptake and photosynthesis. Continued dry conditions will cause wilting, reduced nutrient uptake, and potentially permanent root damage if soil becomes hydrophobic.`,
        [
          "Start a deep irrigation cycle — shallow watering won't reach the root zone",
          "Water slowly and deeply to allow proper soil absorption",
          "Check for soil compaction or crusting that may be preventing water infiltration",
          "Recheck moisture levels within 2–4 hours after irrigation completes",
        ],
        90
      )
    );
  } else if (m > THRESHOLDS.moisture.high) {
    recs.push(
      makeRec(
        "moisture",
        "warning",
        `Soil oversaturated (${m.toFixed(0)}%) — risk of root rot`,
        "Droplets",
        `Soil moisture at ${m.toFixed(0)}% indicates waterlogged conditions above the safe threshold of ${THRESHOLDS.moisture.high}%. Excess water fills air pockets in the soil, depriving roots of oxygen. This creates anaerobic conditions that promote root rot pathogens (Pythium, Phytophthora), fungal growth, and nutrient lockout. Roots begin to decay within 24–48 hours of continuous saturation.`,
        [
          "Stop all irrigation immediately and allow soil to drain naturally",
          "Check drainage channels and ensure they are not blocked",
          "If using containers, elevate them to improve drainage from the bottom",
          "Monitor for foul smell or brown, mushy roots — signs of active root rot",
        ],
        88
      )
    );
  } else {
    recs.push(
      makeRec(
        "moisture",
        "info",
        `Soil moisture is optimal (${m.toFixed(0)}%) — healthy water balance`,
        "Sprout",
        `Soil moisture at ${m.toFixed(0)}% is within the ideal range for root health and nutrient uptake. At this level, soil particles hold water loosely enough for roots to absorb it easily while maintaining adequate air spaces for oxygen exchange. This balance supports robust root growth, efficient nutrient transport, and optimal microbial activity in the rhizosphere.`,
        [
          "Maintain current irrigation schedule — no changes needed",
          "Continue monitoring every 30 minutes for any rapid changes",
        ],
        97
      )
    );
  }

  // ── Water Level ──────────────────────────────────────────────
  if (w < THRESHOLDS.waterLevel.critical) {
    recs.push(
      makeRec(
        "waterLevel",
        "critical",
        `Reservoir critically low (${w.toFixed(0)}%) — refill immediately`,
        "AlertTriangle",
        `The water reservoir has dropped to just ${w.toFixed(0)}%, dangerously close to empty. At this level, the pump may begin drawing air, causing cavitation damage to the pump impeller. Any irrigation cycle started now will likely fail partway through, leaving crops in a worse state than before. This is an urgent maintenance priority.`,
        [
          "Refill the water reservoir immediately before initiating any irrigation",
          "Inspect the pump intake for debris or blockage that may have caused the rapid drain",
          "Check for leaks in irrigation lines — a sudden drop could indicate a breach",
          "Once refilled, run a short test cycle to verify pump operation is normal",
        ],
        98
      )
    );
  } else if (w < THRESHOLDS.waterLevel.low) {
    recs.push(
      makeRec(
        "waterLevel",
        "warning",
        `Water level low (${w.toFixed(0)}%) — plan to refill soon`,
        "Waves",
        `Reservoir level at ${w.toFixed(0)}% is approaching the minimum operating threshold. While the system can still function, initiating long irrigation cycles risks running the tank dry mid-operation. A typical full irrigation cycle consumes 8–12% of tank capacity depending on zone coverage.`,
        [
          "Schedule a refill within the next few hours",
          "Reduce irrigation cycle duration until the reservoir is replenished",
          "Plan refill during off-peak hours to avoid interrupting scheduled watering",
        ],
        80
      )
    );
  } else {
    recs.push(
      makeRec(
        "waterLevel",
        "info",
        `Reservoir level healthy (${w.toFixed(0)}%) — sufficient for operations`,
        "Waves",
        `Water reservoir is at ${w.toFixed(0)}%, well within the safe operating range. This provides ample supply for multiple full irrigation cycles. The system has sufficient reserves to handle all scheduled watering routines and emergency cooling if needed.`,
        [
          "No action required — reservoir is in good condition",
          "Consider tracking daily consumption to predict refill needs",
        ],
        96
      )
    );
  }

  return recs;
}
