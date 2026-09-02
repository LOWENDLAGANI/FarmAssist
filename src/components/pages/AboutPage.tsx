/**
 * AboutPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * About page showing app information, version, credits,
 * open-source licenses, and legal links.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Leaf, ExternalLink, Heart } from "lucide-react";

const APP_VERSION = "1.0.0";
const BUILD_DATE = "August 2026";

const OSS_LICENSES = [
  { name: "Muhammad Husaini Bin Mohd Hishamuddin", license: "Minetallest", url: "https://farm-ad.vercel.app" },
  { name: "Muhammad Naqeeb Bin Norazam", license: "Qeb", url: "https://farm-ad.vercel.app" },
  { name: "Izzhazim Idzme Bin Mohd Fadzley Idzme", license: "Izeay", url: "https://farm-ad.vercel.app" },
  { name: "Aniq Ishraq Bin Mohd Ismail Salleh", license: "Niq", url: "https://farm-ad.vercel.app" },
];

const CREDITS = [
  { role: "Developer & Maintainer", name: "Minetallest" },
  { role: "AI Assistant", name: "Hikari" },
  { role: "Competition", name: "Agrovator @ Sekolah" },
];

export default function AboutPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      {/* ── Hero Image ── */}
      {/*
        Drop your own picture at: public/about-hero.jpg
        It will be shown here above all text. If the file is missing,
        a styled placeholder with a leaf icon appears instead.
      */}
      <div className="mb-8 aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-cyan-900/20 bg-[#0c1a2e]">
        <img
          src="/about-hero.jpg"
          alt="FarmAssist hero"
          className="h-full w-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = "1";
            img.style.display = "none";
            const placeholder = img.nextElementSibling as HTMLElement;
            if (placeholder) placeholder.style.display = "flex";
          }}
        />
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/30 to-cyan-900/30"
          style={{ display: "none" }}
        >
          <div className="text-center">
            <Leaf className="mx-auto mb-2 h-10 w-10 text-emerald-500/40" />
            <p className="text-xs text-slate-500">
              Drop your picture at<br />public/about-hero.jpg
            </p>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">FarmAssist</h1>
        <p className="mt-1 text-sm text-slate-400">
          [██████████]
        </p>
      </div>

      {/* ── Version Info ── */}
      <section className="mb-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Version</h2>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">App Version</span>
            <span className="font-mono">{APP_VERSION}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Build</span>
            <span>{BUILD_DATE}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status</span>
            <span>Almost ready for production use</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Model used by Hikari</span>
            <span>Gemini 3.5 Flash Lite</span>
          </div>
        </div>
      </section>

      {/* ── Credits ── */}
      <section className="mb-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Credits</h2>
        <div className="space-y-3">
          {CREDITS.map((credit) => (
            <div key={credit.role} className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{credit.role}</span>
              <span className="text-sm text-white">{credit.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Open Source Licenses ── */}
      <section className="mb-6 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">
          Our Team
        </h2>
        <div className="space-y-2">
          {OSS_LICENSES.map((lib) => (
            <div
              key={lib.name}
              className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{lib.name}</span>
                <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {lib.license}
                </span>
              </div>
              <a
                href={lib.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 transition-colors hover:text-cyan-400"
                aria-label={`${lib.name} website`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-slate-500">
        Made with <Heart className="h-3 w-3 text-red-400" /> for smart farming
      </div>
    </div>
  );
}
