/**
 * layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Root layout for FarmAssist IoT Dashboard.
 * Wraps children in ThemeProvider + AuthProvider.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import AssistantWidget from "@/components/AssistantWidget";
import PwaRegistration from "@/components/PwaRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#22d3ee",
};

export const metadata: Metadata = {
  title: "FarmAssist",
  description:
    "Real-time IoT dashboard for monitoring temperature, soil moisture, water level, and light sensors via Firebase.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FarmAssist",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden">
        <AuthProvider>
          <ThemeProvider>
            {children}
            <AssistantWidget />
            <PwaRegistration />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
