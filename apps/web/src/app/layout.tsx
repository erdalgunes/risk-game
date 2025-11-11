import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk PoC',
  description: 'Risk board game proof of concept',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
