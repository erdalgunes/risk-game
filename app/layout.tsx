import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { SkipLink } from "@/components/SkipLink";
import { Analytics } from "@vercel/analytics/react";
import "../sentry.client.config";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  title: "Risk Game - Multiplayer Strategy",
  description: "Play the classic Risk board game online with friends. Conquer territories, deploy armies, and dominate the world!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Risk Game",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SkipLink />
        <ToastProvider>
          {children}
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
