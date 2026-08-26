/**
 * ControlPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Manual control page for the FarmAssist rover.
 * Provides actions like start watering, apply fertilizer,
 * manual override, and emergency stop — each with a
 * confirmation dialog before execution.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";
import {
  Droplets,
  Flower2,
  Hand,
  SprayCan,
  Power,
  AlertTriangle,
  Check,
  X,
  Sun,
  Camera,
  type LucideIcon,
} from "lucide-react";

/* ── Action definitions ─────────────────────────────────────── */

interface ControlAction {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  confirmTitle: string;
  confirmMessage: string;
  /** Whether this action is "destructive" (e.g. emergency stop) */
  destructive?: boolean;
}

const CONTROL_ACTIONS: ControlAction[] = [
  {
    id: "watering",
    label: "Start Watering",
    description: "Activate the water pump to irrigate the soil",
    icon: Droplets,
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
    confirmTitle: "Start Watering?",
    confirmMessage:
      "This will activate the water pump for manual irrigation. The pump will run until you stop it manually.",
  },
  {
    id: "fertilizer",
    label: "Apply Fertilizer",
    description: "Dispense fertilizer for the soil",
    icon: Flower2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    confirmTitle: "Apply Fertilizer?",
    confirmMessage:
      "This will activate the fertilizer dispenser. Make sure there is enough.",
  },
  {
    id: "lighting",
    label: "Toggle Lights",
    description: "Turn the LED on or off",
    icon: Sun,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    confirmTitle: "Toggle Lights?",
    confirmMessage:
      "This will switch the state of the LED",
  },
  {
    id: "manual_override",
    label: "Manual Override",
    description: "Take full control of the rover",
    icon: Hand,
    color: "text-violet-400",
    bgColor: "bg-violet-500/15",
    borderColor: "border-violet-500/30",
    confirmTitle: "Enable Manual Override?",
    confirmMessage:
      "This will disable all automatic routines and give you direct control over the rover. Automated schedules will be paused.",
  },
  {
    id: "camera_calibrate",
    label: "Calibrate Camera",
    description: "Run auto-focus and white balance calibration on the rover camera",
    icon: Camera,
    color: "text-pink-400",
    bgColor: "bg-pink-500/15",
    borderColor: "border-pink-500/30",
    confirmTitle: "Calibrate Camera?",
    confirmMessage:
      "This will run an automatic calibration sequence on the rover camera including focus, exposure, and white balance. The rover must be stationary.",
  },
  {
    id: "spray",
    label: "Spray Pesticide",
    description: "Activate the pesticide sprayer",
    icon: SprayCan,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
    borderColor: "border-cyan-500/30",
    confirmTitle: "Spray Pesticide?",
    confirmMessage:
      "This will activate the pesticide sprayer nozzle.",
  },

  {
    id: "emergency_stop",
    label: "Emergency Stop",
    description: "Immediately stop all rover operations",
    icon: Power,
    color: "text-red-400",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/30",
    destructive: true,
    confirmTitle: "⚠️ Emergency Stop?",
    confirmMessage:
      "This will immediately stop ALL rover operations.",
  },
];

/* ── Confirmation Dialog ────────────────────────────────────── */

interface ConfirmDialogProps {
  action: ControlAction;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ action, onConfirm, onCancel }: ConfirmDialogProps) {
  const Icon = action.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="mx-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-cyan-900/30 bg-[#0c1a2e] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon & Title */}
        <div className="mb-4 flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${action.bgColor}`}
          >
            <Icon className={`h-7 w-7 ${action.color}`} />
          </div>
          <h3 className="text-lg font-bold text-white">{action.confirmTitle}</h3>
        </div>

        {/* Message */}
        <p className="mb-6 text-center text-sm leading-relaxed text-slate-400">
          {action.confirmMessage}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 active:scale-95"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all active:scale-95 ${
              action.destructive
                ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20"
                : "bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20"
            }`}
          >
            <Check className="h-4 w-4" />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Action executed feedback ───────────────────────────────── */

interface ActionFeedbackProps {
  action: ControlAction;
  onDismiss: () => void;
}

function ActionFeedback({ action, onDismiss }: ActionFeedbackProps) {
  const Icon = action.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onDismiss}
    >
      <div
        className="mx-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-cyan-900/30 bg-[#0c1a2e] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${action.bgColor}`}
          >
            <Icon className={`h-7 w-7 ${action.color}`} />
          </div>
          <h3 className="text-lg font-bold text-white">Command Sent!</h3>
        </div>

        <p className="mb-6 text-center text-sm text-slate-400">
          The <span className="font-medium text-slate-200">{action.label}</span>{" "}
          command has been sent to the rover.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-cyan-500 active:scale-95"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/* ── Main ControlPage ───────────────────────────────────────── */

export default function ControlPage() {
  const [pendingAction, setPendingAction] = useState<ControlAction | null>(null);
  const [completedAction, setCompletedAction] = useState<ControlAction | null>(null);

  const handleActionClick = useCallback((action: ControlAction) => {
    setPendingAction(action);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    // Show feedback after a tiny delay so the confirm dialog unmounts first
    setTimeout(() => setCompletedAction(action), 100);
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleDismissFeedback = useCallback(() => {
    setCompletedAction(null);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Control Center</h2>
        <p className="text-sm text-slate-400">
          Manually control your rover and farm equipment
        </p>
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONTROL_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action)}
              className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border p-5 text-left backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] animate-slide-up bg-[#0c1a2e]/95 ${
                action.destructive
                  ? "border-red-500/30"
                  : action.borderColor
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Colored tint over the solid panel — adapts to any background without going transparent */}
              <div
                className={`pointer-events-none absolute inset-0 transition-opacity duration-200 group-hover:opacity-50 ${action.bgColor}`}
              />

              <div className="relative">
                <div
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${action.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <h3 className="mb-1 text-sm font-bold text-white">{action.label}</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  {action.description}
                </p>
                {action.destructive && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Emergency action
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-bold text-slate-300">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {[
            "Morning Routine",
            "Evening Check",
            "Full Maintenance",
            "Water Only",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/30 hover:text-cyan-400 active:scale-95"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      {pendingAction && (
        <ConfirmDialog
          action={pendingAction}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* ── Action feedback dialog ── */}
      {completedAction && (
        <ActionFeedback
          action={completedAction}
          onDismiss={handleDismissFeedback}
        />
      )}
    </div>
  );
}
