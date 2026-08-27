/**
 * Skeleton.tsx
 * ─────────────────────────────────────────────────────────────────
 * Reusable skeleton loading placeholders that match the app's dark
 * theme. Each variant mirrors a real component's shape so the layout
 * doesn't shift when content loads.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

interface SkeletonProps {
  className?: string;
}

/** Base shimmer animation pill. */
function Shimmer({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-700/40 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Circular gauge skeleton (sensor card). */
export function SkeletonGauge() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4">
      <Shimmer className="h-4 w-20 rounded-md" />
      <Shimmer className="h-24 w-24 rounded-full" />
      <Shimmer className="h-3 w-12 rounded-md" />
      <Shimmer className="h-2.5 w-24 rounded-md" />
    </div>
  );
}

/** Welcome banner skeleton. */
export function SkeletonBanner() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-900/30 bg-[#0c1a2e] p-6 sm:mb-8">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-3">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-4 w-64" />
          <div className="flex gap-2 pt-1">
            <Shimmer className="h-5 w-20 rounded-full" />
            <Shimmer className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <Shimmer className="hidden h-24 w-32 rounded-xl md:block" />
      </div>
    </div>
  );
}

/** Gamification bar skeleton. */
export function SkeletonGamificationBar() {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-3 sm:mb-8 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2">
        <Shimmer className="h-10 w-10 rounded-xl" />
        <div className="space-y-1">
          <Shimmer className="h-3 w-12" />
          <Shimmer className="h-4 w-16" />
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-2.5 w-full" />
        <Shimmer className="h-2 w-20" />
      </div>
      <Shimmer className="h-6 w-12 rounded-full" />
      <Shimmer className="h-6 w-12 rounded-full" />
    </div>
  );
}

/** Daily challenges skeleton. */
export function SkeletonChallenges() {
  return (
    <div className="mb-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4 sm:mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shimmer className="h-5 w-5 rounded" />
          <Shimmer className="h-4 w-28" />
        </div>
        <Shimmer className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-3">
            <Shimmer className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3.5 w-32" />
              <Shimmer className="h-2.5 w-full" />
            </div>
            <Shimmer className="h-7 w-16 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chart section skeleton. */
export function SkeletonChart() {
  return (
    <div className="mb-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4 sm:mb-8 sm:p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-1.5">
          <Shimmer className="h-5 w-40" />
          <Shimmer className="h-3.5 w-52" />
        </div>
        <Shimmer className="h-8 w-24 rounded-lg" />
      </div>
      <div className="h-56 sm:h-72">
        <Shimmer className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Recommendation panel skeleton. */
export function SkeletonRecommendations() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4"
        >
          <div className="flex items-start gap-3">
            <Shimmer className="mt-0.5 h-5 w-5 rounded shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-5 w-16 rounded-full" />
              </div>
              <Shimmer className="h-3.5 w-full" />
              <div className="space-y-1.5 pt-1">
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full page loading state (centered spinner with message). */
export function SkeletonPage({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
