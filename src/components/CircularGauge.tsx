/**
 * CircularGauge.tsx
 * ─────────────────────────────────────────────────────────────────
 * SVG-based circular arc gauge for displaying sensor values.
 * Renders a ~270° arc with a colored fill based on the current
 * value relative to min/max range.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useMemo } from "react";

interface CircularGaugeProps {
  /** Current sensor value */
  value: number;
  /** Minimum value on the gauge scale */
  min: number;
  /** Maximum value on the gauge scale */
  max: number;
  /** Accent color (hex) for the filled arc */
  color: string;
  /** Display unit (e.g. "°C", "%") */
  unit: string;
  /** Number of decimal places */
  decimals?: number;
  /** Gauge size in pixels */
  size?: number;
}

export default function CircularGauge({
  value,
  min,
  max,
  color,
  unit,
  decimals = 1,
  size = 180,
}: CircularGaugeProps) {
  const { arcPath, bgArcPath } = useMemo(() => {
    // Arc spans 270° (from 135° to 405°, i.e. 3/4 of a circle)
    const arcDegrees = 270;
    const startAngle = 135; // degrees
    const endAngle = startAngle + arcDegrees;

    // Clamp value between min and max
    const clamped = Math.max(min, Math.min(max, value));
    const pct = max > min ? (clamped - min) / (max - min) : 0;

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - 16) / 2; // 8px padding on each side

    // Convert degrees to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // SVG arc helper
    const describeArc = (
      centerX: number,
      centerY: number,
      r: number,
      angleStart: number,
      angleEnd: number
    ): string => {
      const sx = centerX + r * Math.cos(toRad(angleStart));
      const sy = centerY + r * Math.sin(toRad(angleStart));
      const ex = centerX + r * Math.cos(toRad(angleEnd));
      const ey = centerY + r * Math.sin(toRad(angleEnd));
      const largeArc = angleEnd - angleStart > 180 ? 1 : 0;
      return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
    };

    // Background arc (full 270°)
    const bgPath = describeArc(cx, cy, radius, startAngle, endAngle);

    // Filled arc (proportional to value)
    const fillEnd = startAngle + arcDegrees * pct;
    const fPath =
      pct > 0.001
        ? describeArc(cx, cy, radius, startAngle, fillEnd)
        : "";

    return { arcPath: fPath, bgArcPath: bgPath };
  }, [value, min, max, size]);

  // Format the display value
  const displayValue =
    value !== null && value !== undefined
      ? value.toFixed(decimals)
      : "—";

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-lg"
      >
        {/* Background arc */}
        <path
          d={bgArcPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Glow effect on the filled arc tip */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.3}
            filter="blur(6px)"
          />
        )}

        {/* Value text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white text-3xl font-bold"
          style={{ fontSize: size * 0.22 }}
        >
          {displayValue}
        </text>

        {/* Unit text */}
        <text
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-400"
          style={{ fontSize: size * 0.1 }}
        >
          {unit}
        </text>
      </svg>
    </div>
  );
}
