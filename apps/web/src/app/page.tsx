'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '20px',
      backgroundColor: '#1a1a1a',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>Risk PoC</h1>
      <p style={{ fontSize: '18px', color: '#888' }}>Simplified 6-territory Risk game</p>

      <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
        <Link
          href="/game/single"
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Single Player (vs AI)
        </Link>

        <Link
          href="/game/multi"
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Multiplayer
        </Link>
      </div>
    </div>
  );
}
