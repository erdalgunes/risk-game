import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Risk Game Clone",
  description: "Multiplayer Risk board game built with Next.js 15 and Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
