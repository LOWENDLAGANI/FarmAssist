/**
 * CustomThemeBuilder.tsx
 * ─────────────────────────────────────────────────────────────────
 * Interactive theme builder that lets users create custom themes
 * by choosing colors for background, card, accent, and foreground.
 * Includes live preview and preset palettes.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { Palette, Check, RotateCcw, Sparkles } from "lucide-react";
import { useAppTheme } from "./ThemeProvider";
import type { CustomThemeConfig } from "@/hooks/useTheme";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-mono">{value}</span>
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="h-7 w-7 rounded-lg border-2 border-white/20 shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: value }}
          />
        </label>
      </div>
    </div>
  );
}

interface PresetPalette {
  name: string;
  config: CustomThemeConfig;
}

const PRESET_PALETTES: PresetPalette[] = [
  {
    name: "Violet Dreams",
    config: {
      name: "Violet Dreams",
      background: "#0f0a1a",
      card: "#1a1230",
      accent: "#8b5cf6",
      foreground: "#f1f5f9",
      muted: "#2a1f45",
    },
  },
  {
    name: "Emerald City",
    config: {
      name: "Emerald City",
      background: "#0a1a12",
      card: "#122a1a",
      accent: "#10b981",
      foreground: "#f1fdf4",
      muted: "#1a3a25",
    },
  },
  {
    name: "Ruby Red",
    config: {
      name: "Ruby Red",
      background: "#1a0a0a",
      card: "#2a1212",
      accent: "#ef4444",
      foreground: "#fef2f2",
      muted: "#3a1a1a",
    },
  },
  {
    name: "Ocean Blue",
    config: {
      name: "Ocean Blue",
      background: "#0a121a",
      card: "#122030",
      accent: "#3b82f6",
      foreground: "#f1f5f9",
      muted: "#1a2a40",
    },
  },
  {
    name: "Amber Gold",
    config: {
      name: "Amber Gold",
      background: "#1a150a",
      card: "#2a2012",
      accent: "#f59e0b",
      foreground: "#fefce8",
      muted: "#3a2a1a",
    },
  },
  {
    name: "Rose Pink",
    config: {
      name: "Rose Pink",
      background: "#1a0a12",
      card: "#2a1220",
      accent: "#ec4899",
      foreground: "#fdf2f8",
      muted: "#3a1a2a",
    },
  },
];

interface CustomThemeBuilderProps {
  onClose?: () => void;
}

export default function CustomThemeBuilder({ onClose }: CustomThemeBuilderProps) {
  const { customTheme, setCustomTheme, applyCustomTheme, theme } = useAppTheme();
  const [localTheme, setLocalTheme] = useState<CustomThemeConfig>(customTheme);
  const [isApplying, setIsApplying] = useState(false);

  const handleChange = (key: keyof CustomThemeConfig, value: string) => {
    setLocalTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    setIsApplying(true);
    setCustomTheme(localTheme);
    applyCustomTheme();
    setTimeout(() => {
      setIsApplying(false);
      onClose?.();
    }, 300);
  };

  const handleReset = () => {
    const defaultTheme: CustomThemeConfig = {
      name: "My Theme",
      background: "#0a0a1a",
      card: "#121225",
      accent: "#8b5cf6",
      foreground: "#f1f5f9",
      muted: "#1e1e3a",
    };
    setLocalTheme(defaultTheme);
  };

  const handlePresetSelect = (preset: PresetPalette) => {
    setLocalTheme(preset.config);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white">Theme Builder</h4>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Preset Palettes */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span className="text-[11px] font-medium text-slate-300">Quick Presets</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_PALETTES.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              className="group flex flex-col items-center gap-1.5 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-2.5 transition-all hover:border-cyan-800/30 hover:bg-[#0f2240]"
            >
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.config.background }} />
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.config.card }} />
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.config.accent }} />
              </div>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-300">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Pickers */}
      <div className="space-y-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Palette className="h-3 w-3 text-cyan-400" />
          <span className="text-[11px] font-medium text-slate-300">Custom Colors</span>
        </div>
        <ColorPicker
          label="Background"
          value={localTheme.background}
          onChange={(v) => handleChange("background", v)}
        />
        <ColorPicker
          label="Card"
          value={localTheme.card}
          onChange={(v) => handleChange("card", v)}
        />
        <ColorPicker
          label="Accent"
          value={localTheme.accent}
          onChange={(v) => handleChange("accent", v)}
        />
        <ColorPicker
          label="Text"
          value={localTheme.foreground}
          onChange={(v) => handleChange("foreground", v)}
        />
        <ColorPicker
          label="Muted"
          value={localTheme.muted}
          onChange={(v) => handleChange("muted", v)}
        />
      </div>

      {/* Live Preview */}
      <div>
        <span className="mb-2 block text-[11px] font-medium text-slate-400">Preview</span>
        <div
          className="rounded-xl border p-4 transition-all duration-300"
          style={{
            backgroundColor: localTheme.background,
            borderColor: `${localTheme.accent}33`,
          }}
        >
          <div
            className="rounded-lg p-3 transition-all duration-300"
            style={{ backgroundColor: localTheme.card }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg"
                style={{ backgroundColor: `${localTheme.accent}33` }}
              />
              <div>
                <div
                  className="h-3 w-24 rounded"
                  style={{ backgroundColor: localTheme.foreground }}
                />
                <div
                  className="mt-1 h-2 w-16 rounded"
                  style={{ backgroundColor: localTheme.muted }}
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div
                className="h-6 w-16 rounded-md"
                style={{ backgroundColor: `${localTheme.accent}33` }}
              />
              <div
                className="h-6 w-16 rounded-md"
                style={{ backgroundColor: localTheme.muted }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        disabled={isApplying}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: localTheme.accent }}
      >
        {isApplying ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Applying...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Apply Theme
          </>
        )}
      </button>

      {theme === "custom" && (
        <p className="text-center text-[10px] text-emerald-400">
          ✓ Custom theme active
        </p>
      )}
    </div>
  );
}
