/**
 * CircularGauge.tsx
 * ─────────────────────────────────────────────────────────────────
 * SVG-based circular arc gauge for displaying sensor values.
 * Renders a clean 270° arc (C-shape) with a colored fill based
 * on the current value relative to min/max range.
 *
 * Uses stroke-dashoffset for smooth CSS-transitionable arc fills,
 * and requestAnimationFrame for silky number interpolation.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useRef, useMemo } from "react";

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

/** Arc geometry constants (270° C-shape) */
const ARC_DEGREES = 270;
const START_ANGLE = 135; // bottom-left

export default function CircularGauge({
  value,
  min,
  max,
  color,
  unit,
  decimals = 1,
  size = 180,
}: CircularGaugeProps) {
  // ── Smooth number interpolation via rAF ──────────────────────
  const [displayValue, setDisplayValue] = useState(value);
  const rafRef = useRef<number>(0);
  const currentRef = useRef(value);
  const targetRef = useRef(value);

  useEffect(() => {
    targetRef.current = value;

    const tick = () => {
      const diff = targetRef.current - currentRef.current;
      // Ease toward target — ~8% per frame gives a smooth 60fps lerp
      if (Math.abs(diff) < 0.001) {
        currentRef.current = targetRef.current;
        setDisplayValue(targetRef.current);
        return;
      }
      currentRef.current += diff * 0.08;
      setDisplayValue(currentRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  // ── SVG arc geometry (only depends on size, not value) ───────
  const { bgArcPath, totalArcLength } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - 16) / 2; // 8px padding on each side
    const endAngle = START_ANGLE + ARC_DEGREES;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

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

    const bgPath = describeArc(cx, cy, radius, START_ANGLE, endAngle);

    // Arc length = 2πr × (sweep/360)
    const arcLen = (2 * Math.PI * radius * ARC_DEGREES) / 360;

    return { bgArcPath: bgPath, totalArcLength: arcLen };
  }, [size]);

  // ── Compute fill percentage from displayValue ────────────────
  const clamped = Math.max(min, Math.min(max, displayValue));
  const pct = max > min ? (clamped - min) / (max - min) : 0;
  const fillOffset = totalArcLength * (1 - pct);

  // Format the display number
  const formattedValue =
    displayValue !== null && displayValue !== undefined
      ? displayValue.toFixed(decimals)
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
          strokeDasharray={totalArcLength}
          strokeDashoffset={0}
        />

        {/* Filled arc — smooth CSS transition on stroke-dashoffset */}
        <path
          d={bgArcPath}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={totalArcLength}
          strokeDashoffset={fillOffset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />

        {/* Glow effect on the filled arc */}
        <path
          d={bgArcPath}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={totalArcLength}
          strokeDashoffset={fillOffset}
          opacity={0.3}
          style={{
            filter: "blur(6px)",
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {/* Value text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white text-3xl font-bold"
          style={{ fontSize: size * 0.22 }}
        >
          {formattedValue}
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
