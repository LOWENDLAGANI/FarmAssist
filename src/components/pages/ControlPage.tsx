/**
 * ControlPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Manual control page for the FarmAssist rover.
 * Provides actions like start watering, apply fertilizer,
 * manual override, and emergency stop — each with a
 * confirmation dialog before execution.
 *
 * Commands are written to Firebase RTDB at:
 *   users/{uid}/devices/{deviceId}/commands/{commandId}
 * The ESP32 polls this path and executes the command.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";
import { push, set, serverTimestamp } from "firebase/database";
import { commandsRef } from "@/lib/firebaseConfig";
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
  Loader2,
  AlertCircle,
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
  sending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ action, sending, onConfirm, onCancel }: ConfirmDialogProps) {
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
            disabled={sending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 active:scale-95 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60 ${
              action.destructive
                ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20"
                : "bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20"
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Action Result Dialog ───────────────────────────────────── */

interface ActionResultProps {
  action: ControlAction;
  status: "success" | "error";
  errorMessage?: string;
  onDismiss: () => void;
}

function ActionResult({ action, status, errorMessage, onDismiss }: ActionResultProps) {
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
            className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
              status === "success" ? action.bgColor : "bg-red-500/15"
            }`}
          >
            {status === "success" ? (
              <Icon className={`h-7 w-7 ${action.color}`} />
            ) : (
              <AlertCircle className="h-7 w-7 text-red-400" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white">
            {status === "success" ? "Command Sent!" : "Failed to Send"}
          </h3>
        </div>

        <p className="mb-6 text-center text-sm text-slate-400">
          {status === "success" ? (
            <>
              The <span className="font-medium text-slate-200">{action.label}</span>{" "}
              command has been sent to the rover.
            </>
          ) : (
            <>
              Could not send the <span className="font-medium text-slate-200">{action.label}</span> command.
              {errorMessage && (
                <span className="mt-1 block text-xs text-red-400">{errorMessage}</span>
              )}
            </>
          )}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-all hover:active:scale-95 ${
            status === "success"
              ? "bg-cyan-600 hover:bg-cyan-500"
              : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {status === "success" ? "Got it" : "Try Again"}
        </button>
      </div>
    </div>
  );
}

/* ── Main ControlPage ───────────────────────────────────────── */

interface ControlPageProps {
  userId: string;
  deviceId: string;
}

export default function ControlPage({ userId, deviceId }: ControlPageProps) {
  const [pendingAction, setPendingAction] = useState<ControlAction | null>(null);
  const [sending, setSending] = useState(false);
  const [resultAction, setResultAction] = useState<ControlAction | null>(null);
  const [resultStatus, setResultStatus] = useState<"success" | "error">("success");
  const [resultError, setResultError] = useState<string | undefined>();

  const handleActionClick = useCallback((action: ControlAction) => {
    setPendingAction(action);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingAction || !userId || !deviceId) return;
    const action = pendingAction;
    setPendingAction(null);
    setSending(true);

    try {
      // Write command to Firebase RTDB
      // Path: users/{uid}/devices/{deviceId}/commands/{commandId}
      const newRef = push(commandsRef(userId, deviceId));
      await set(newRef, {
        action: action.id,
        timestamp: Date.now(),
        status: "pending",
      });

      setResultStatus("success");
      setResultError(undefined);
    } catch (err) {
      console.error(`[ControlPage] Failed to send command "${action.id}":`, err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setResultStatus("error");
      setResultError(message);
    } finally {
      setSending(false);
      // Show result dialog after a tiny delay so the confirm dialog unmounts first
      setTimeout(() => setResultAction(action), 100);
    }
  }, [pendingAction, userId, deviceId]);

  const handleCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleDismissResult = useCallback(() => {
    setResultAction(null);
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

      {/* Rover info */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-xs text-slate-400">
          Sending commands to <span className="font-mono text-cyan-400">{deviceId}</span>
        </span>
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
              disabled={sending}
              className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border p-5 text-left backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] animate-slide-up bg-[#0c1a2e]/95 disabled:opacity-50 disabled:cursor-not-allowed ${
                action.destructive
                  ? "border-red-500/30"
                  : action.borderColor
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Colored tint over the solid panel */}
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

      {/* Quick Presets */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-bold text-slate-300">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Morning Routine", actions: ["lighting", "watering"] },
            { label: "Evening Check", actions: ["watering"] },
            { label: "Full Maintenance", actions: ["watering", "fertilizer", "lighting"] },
            { label: "Water Only", actions: ["watering"] },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={sending}
              onClick={() => {
                // Send the first action as a quick command
                const firstAction = CONTROL_ACTIONS.find((a) => preset.actions.includes(a.id));
                if (firstAction) handleActionClick(firstAction);
              }}
              className="rounded-xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/30 hover:text-cyan-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      {pendingAction && (
        <ConfirmDialog
          action={pendingAction}
          sending={sending}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* ── Result dialog ── */}
      {resultAction && (
        <ActionResult
          action={resultAction}
          status={resultStatus}
          errorMessage={resultError}
          onDismiss={handleDismissResult}
        />
      )}
    </div>
  );
}
