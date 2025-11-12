import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Risk Game',
  description: 'Strategic board game - Conquer the world territory by territory',
  applicationName: 'Risk Game',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Risk Game',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  themeColor: '#1a1a1a',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1a1a1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          html, body {
            overscroll-behavior: none !important;
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
