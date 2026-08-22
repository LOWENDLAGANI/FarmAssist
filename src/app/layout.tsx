/**
 * layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Root layout for FarmAssist IoT Dashboard.
 * Wraps children in ThemeProvider for global dark/light mode support.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FarmAssist — IoT Dashboard",
  description:
    "Real-time IoT dashboard for monitoring temperature, humidity, soil moisture, and water level sensors via Firebase.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
