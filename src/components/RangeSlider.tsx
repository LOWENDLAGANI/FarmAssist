"use client";

import { useState, useEffect, useRef } from "react";

function getRangePercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

export interface VisualRangeSelectorProps {
  label: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (field: "optimalMin" | "optimalMax", value: number) => void;
}

export function VisualRangeSelector({
  label,
  unit,
  color,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
}: VisualRangeSelectorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"optimalMin" | "optimalMax" | null>(null);

  const updateFromPointer = (
    clientX: number,
    handle: "optimalMin" | "optimalMax"
  ) => {
    const track = trackRef.current;
    if (!track) return;

    const bounds = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const rawValue = min + ratio * (max - min);
    const snappedValue = Number((Math.round(rawValue / step) * step).toFixed(6));
    onChange(handle, snappedValue);
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const minX = getRangePercent(valueMin, min, max);
    const maxX = getRangePercent(valueMax, min, max);
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const handle = Math.abs(pointerX - minX) <= Math.abs(pointerX - maxX)
      ? "optimalMin"
      : "optimalMax";

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(handle);
    updateFromPointer(event.clientX, handle);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) updateFromPointer(event.clientX, dragging);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
  };

  const handleKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    handle: "optimalMin" | "optimalMax"
  ) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowUp"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : 0;
    if (!direction) return;

    event.preventDefault();
    onChange(handle, (handle === "optimalMin" ? valueMin : valueMax) + direction * step);
  };

  const minPercent = getRangePercent(valueMin, min, max);
  const maxPercent = getRangePercent(valueMax, min, max);

  return (
    <div className="mt-4 rounded-xl border border-cyan-900/20 bg-[#0c1a2e] px-3 py-3">
      <div className="mb-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>{min} {unit}</span>
        <span className="font-medium text-slate-400">Drag either handle to set the optimal range</span>
        <span>{max} {unit}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-9 touch-none select-none"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#131f35]" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          style={{ backgroundColor: color, left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        {(["optimalMin", "optimalMax"] as const).map((handle) => {
          const value = handle === "optimalMin" ? valueMin : valueMax;
          const percent = handle === "optimalMin" ? minPercent : maxPercent;
          return (
            <button
              key={handle}
              type="button"
              role="slider"
              aria-label={`${label} optimal ${handle === "optimalMin" ? "minimum" : "maximum"}`}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={`${value} ${unit}`}
              onKeyDown={(event) => handleKeyboard(event, handle)}
              className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0c1a2e] bg-sky-100 shadow-[0_0_0_2px_#22d3ee,0_2px_8px_rgba(6,182,212,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition-transform hover:scale-125"
              style={{ left: `${percent}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs font-medium">
        <span style={{ color }}>{valueMin} {unit}</span>
        <span style={{ color }}>{valueMax} {unit}</span>
      </div>
    </div>
  );
}

interface RangeNumberInputProps {
  label: string;
  value: number;
  step: number;
  onCommit: (value: number) => void;
}

export function RangeNumberInput({ label, value, step, onCommit }: RangeNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setDraft(String(value));
  }, [isEditing, value]);

  const commit = () => {
    const parsed = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(parsed)) {
      onCommit(parsed);
    } else {
      setDraft(String(value));
    }
    setIsEditing(false);
  };

  return (
    <input
      type="number"
      value={draft}
      step={step}
      inputMode="decimal"
      aria-label={label}
      onFocus={() => setIsEditing(true)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="w-full rounded-lg border border-cyan-900/20 bg-[#0c1a2e] px-3 py-2 text-xs text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
    />
  );
}
