/**
 * page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Home page — renders the FarmAssist IoT Dashboard.
 *
 * All dashboard logic lives in the Dashboard component.
 * This page simply mounts it.
 * ─────────────────────────────────────────────────────────────────
 */

import Dashboard from "@/components/Dashboard";

export default function Home() {
  return <Dashboard />;
}
