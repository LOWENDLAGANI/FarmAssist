/**
 * CameraPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Camera feed page for leaf disease detection.
 * Placeholder for future camera integration.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Camera, Leaf, WifiOff } from "lucide-react";

export default function CameraPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Leaf Camera</h2>
        <p className="text-sm text-slate-400">This Guy Is Powered By Minetallest</p>
      </div>

      {/* Camera feed placeholder */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-12">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-800/50">
          <Camera className="h-12 w-12 text-slate-500" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">Camera Not Connected</h3>
        <p className="mb-6 max-w-md text-center text-sm text-slate-400">
          SAMBUNG KAMERA PLS
          GAMBAR DAUN
        </p>

        {/* Feature cards */}
        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-4">
            <Leaf className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs font-medium text-slate-300">KESAN PENYAKIT 😘😘😘</p>
              <p className="text-[10px] text-slate-500">live</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-4">
            <WifiOff className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs font-medium text-slate-300">AKAN DATANG</p>
              <p className="text-[10px] text-slate-500">AKAN DATANG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
