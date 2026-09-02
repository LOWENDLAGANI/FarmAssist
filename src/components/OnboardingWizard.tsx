/**
 * OnboardingWizard.tsx
 * ─────────────────────────────────────────────────────────────────
 * First-time onboarding wizard that appears for new users.
 * Guides them through 4 key steps:
 *   1. Welcome + what FarmAssist does
 *   2. Pair your Rover (device ID)
 *   3. Set sensor ranges
 *   4. Enable notifications
 *
 * State is persisted in localStorage so it only shows once.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";
import {
  Leaf,
  Cpu,
  Sliders,
  Bell,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
} from "lucide-react";

const STORAGE_KEY = "farmassist-onboarding-done";

function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function markOnboardingDone(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip: string;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Leaf className="h-8 w-8" />,
    title: "Welcome to FarmAssist!",
    description:
      "FarmAssist is used to monitor and manage your farm in real time.",
    tip: "You're looking at the dashboard!!",
    color: "from-emerald-500/20 to-green-500/20",
  },
  {
    icon: <Cpu className="h-8 w-8" />,
    title: "Pair Your Rover",
    description:
      "To pair with your Rover, go to Settings → Device Pairing and enter the model of the rover.",
    tip: "Look carefully at the model number on your Rover. Goodluck finding it!👍😉",
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    icon: <Sliders className="h-8 w-8" />,
    title: "Set Sensor Ranges",
    description:
      "Choose and configure the correct sensor range for your plant.",
    tip: "The current sensor ranges works for most plant and btw don't forget to double check the value according to your plant.",
    color: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: <Bell className="h-8 w-8" />,
    title: "Enable Notifications",
    description:
      "Allow notifications so you get alert. If you already rejected it, you can always enable it back in your browser settings",
    tip: "Feel free change the notification you receive in Settings → Notifications.",
    color: "from-amber-500/20 to-orange-500/20",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      markOnboardingDone();
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleSkip = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-cyan-900/30 bg-[#0a1628] shadow-2xl"
        role="dialog"
        aria-label="Welcome wizard"
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 z-10 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          Skip
        </button>

        {/* Step illustration */}
        <div
          className={`flex items-center justify-center bg-gradient-to-br ${current.color} py-10`}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-white">
            {current.icon}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-5">
          <h2 className="mb-2 text-xl font-bold text-white">{current.title}</h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-300">
            {current.description}
          </p>

          {/* Tip */}
          <div className="mb-6 rounded-xl border border-cyan-900/20 bg-cyan-500/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-cyan-300/80">
              💡 {current.tip}
            </p>
          </div>

          {/* Progress dots */}
          <div className="mb-5 flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 bg-cyan-400"
                    : i < step
                      ? "w-2 bg-cyan-600"
                      : "w-2 bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 0}
              className="flex h-10 items-center gap-1 rounded-xl px-4 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLast ? (
                <>
                  Get Started
                  <Sparkles className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { isOnboardingDone };
