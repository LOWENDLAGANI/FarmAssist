/**
 * DailyChallenges.tsx
 * ─────────────────────────────────────────────────────────────────
 * Compact widget showing today's 3 daily challenges with progress
 * bars and claim buttons. Shown on the dashboard below the
 * GamificationBar.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { DailyChallengeState, DailyChallenges as DailyChallengesData } from "@/types/dailyChallenge";
import { getChallengeDef, getMultiplier } from "@/lib/dailyChallenges";

interface DailyChallengesProps {
  /** Today's challenges with progress. */
  challenges: DailyChallengesData | null;
  /** Login streak (for multiplier display). */
  loginStreak: number;
  /** Called when user taps "Claim" on a completed challenge. */
  onClaim: (challengeId: string) => void;
}

export default function DailyChallenges({
  challenges,
  loginStreak,
  onClaim,
}: DailyChallengesProps) {
  if (!challenges || challenges.challenges.length === 0) return null;

  const { label: multiplierLabel, colorClass: multiplierColor } =
    getMultiplier(loginStreak);

  return (
    <div className="mb-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4 sm:mb-8 sm:p-5">
      {/* ── Header ── */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-sm font-bold text-white">Daily Challenges</h3>
        </div>
        {loginStreak >= 3 && (
          <span
            className={`rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold ${multiplierColor}`}
          >
            {multiplierLabel}
          </span>
        )}
      </div>

      {/* ── Challenge Cards ── */}
      <div className="space-y-2">
        {challenges.challenges.map((ch) => (
          <ChallengeCard
            key={ch.challengeId}
            state={ch}
            onClaim={onClaim}
          />
        ))}
      </div>
    </div>
  );
}

// ── Individual Challenge Card ───────────────────────────────────

function ChallengeCard({
  state,
  onClaim,
}: {
  state: DailyChallengeState;
  onClaim: (id: string) => void;
}) {
  const def = getChallengeDef(state.challengeId);
  if (!def) return null;

  const progress = Math.min(state.progress / def.target, 1);
  const isClaimable = state.completed && !state.claimed;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
        state.claimed
          ? "border-emerald-500/20 bg-emerald-950/20 opacity-60"
          : state.completed
            ? "border-amber-500/30 bg-amber-950/20 hover:border-amber-500/50"
            : "border-slate-800/50 bg-[#0a1525]"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
          state.claimed
            ? "bg-emerald-500/10"
            : state.completed
              ? "bg-amber-500/20"
              : "bg-slate-800/50"
        }`}
      >
        {state.claimed ? "✅" : def.icon}
      </div>

      {/* Text + Progress */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold truncate ${
              state.claimed ? "text-emerald-400" : "text-white"
            }`}
          >
            {def.title}
          </span>
          <span className="text-[10px] text-slate-500">
            {state.progress}/{def.target}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              state.claimed
                ? "bg-emerald-500"
                : state.completed
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-cyan-600 to-cyan-400"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Claim Button */}
      <div className="shrink-0">
        {state.claimed ? (
          <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400">
            +{def.xpReward} ✓
          </span>
        ) : state.completed ? (
          <button
            onClick={() => onClaim(def.id)}
            className="rounded-md bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400 transition-all hover:scale-105 hover:bg-amber-500/30 active:scale-95"
          >
            +{def.xpReward} XP
          </button>
        ) : (
          <span className="rounded-md bg-slate-800/50 px-2 py-1 text-[10px] text-slate-600">
            {def.xpReward} XP
          </span>
        )}
      </div>
    </div>
  );
}
