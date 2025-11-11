import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk Game - Proof of Concept',
  description: 'Simplified Risk board game - Technical validation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
