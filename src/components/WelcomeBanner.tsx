/**
 * WelcomeBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Hero greeting banner shown at the top of the Dashboard page.
 *
 * Layout (matches the reference design):
 *  • Green gradient panel with rounded corners
 *  • Left: greeting heading + subtitle + info pill badges
 *  • Right: decorative illustration / background picture
 *
 * 🖼️ PICTURE SETUP:
 * Drop your banner artwork at:   public/welcome-banner.png
 * It will automatically appear on the right side of the banner.
 * If no image is present, the green gradient fallback is shown.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

export interface WelcomeBadge {
  icon: string;
  label: string;
}

interface WelcomeBannerProps {
  /** Display name shown in the greeting. */
  userName?: string;
  /** Pill badges rendered under the subtitle (derived from programme data). */
  badges: WelcomeBadge[];
}

export default function WelcomeBanner({
  userName,
  badges,
}: WelcomeBannerProps) {
  const displayName = userName?.trim() || "there";

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-900/30 sm:mb-8">
      {/* ── Background artwork (right side) ── */}
      {/* Put your image at public/welcome-banner.png to see it here */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-[55%] bg-cover bg-center md:block"
        style={{ backgroundImage: 'url("/welcome-banner.png")' }}
      />
      {/* Mobile: full-width artwork behind everything */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: 'url("/welcome-banner.png")' }}
      />

      {/* ── Gradient scrim keeps text readable over the artwork ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#14532d] via-[#166534]/95 to-transparent"
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-7 md:max-w-[55%]">
        <h1 className="text-xl font-bold leading-snug text-white sm:text-2xl lg:text-3xl">
          Welcome back,{" "}
          <span className="whitespace-normal">{displayName}</span>{" "}
          <span aria-hidden="true">👋</span>
        </h1>

        <p className="max-w-md text-sm leading-relaxed text-emerald-100/90 sm:text-base">
          WELCOME BACK GUYS TO MY YOUTUBE CHANNEL! WOHOOOOOOOOOOOOOOOOOOOOO
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm"
            >
              <span aria-hidden="true">{badge.icon}</span>
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
