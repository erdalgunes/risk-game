'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@risk-poc/database';
import { ensurePlayer } from '@/utils/player';
import { createLobby, joinLobbyByCode } from '@/utils/lobby';

export default function Home() {
  const router = useRouter();
  const [lobbyCode, setLobbyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      setSupabaseReady(true);
    }
  }, []);

  // Initialize Supabase client
  const supabase = useMemo(() => {
    if (!supabaseReady) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createSupabaseClient(url, key);
  }, [supabaseReady]);

  const handleCreateLobby = async () => {
    if (!supabase) {
      setError('Supabase not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure player exists
      const player = await ensurePlayer(supabase);

      // Create lobby
      const lobby = await createLobby(supabase, player.id, 6);

      // Redirect to lobby page
      router.push(`/lobby/${lobby.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!supabase) {
      setError('Supabase not configured');
      return;
    }

    if (!lobbyCode.trim()) {
      setError('Please enter a lobby code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure player exists
      const player = await ensurePlayer(supabase);

      // Join lobby by code
      const lobby = await joinLobbyByCode(supabase, lobbyCode.trim(), player.id);

      // Redirect to lobby page
      router.push(`/lobby/${lobby.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '20px',
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>Risk PoC</h1>
      <p style={{ fontSize: '18px', color: '#888' }}>Simplified 6-territory Risk game</p>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '15px 20px',
          backgroundColor: '#dc2626',
          color: 'white',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Multiplayer Section */}
      <div style={{
        backgroundColor: '#0a0a0a',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        marginTop: '20px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '30px', textAlign: 'center' }}>Multiplayer</h2>

        <button
          onClick={handleCreateLobby}
          disabled={loading || !supabaseReady}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            backgroundColor: (!loading && supabaseReady) ? '#10b981' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!loading && supabaseReady) ? 'pointer' : 'not-allowed',
            marginBottom: '20px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Creating...' : 'Create New Lobby'}
        </button>

        <div style={{
          textAlign: 'center',
          color: '#888',
          margin: '20px 0',
          fontSize: '14px'
        }}>
          OR
        </div>

        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={lobbyCode}
            onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && lobbyCode.trim() && !loading) {
                handleJoinLobby();
              }
            }}
            placeholder="Enter lobby code"
            disabled={loading || !supabaseReady}
            maxLength={6}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '24px',
              borderRadius: '8px',
              border: '2px solid #555',
              backgroundColor: '#2a2a2a',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '8px',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
          />
        </div>

        <button
          onClick={handleJoinLobby}
          disabled={loading || !lobbyCode.trim() || !supabaseReady}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            backgroundColor: (!loading && lobbyCode.trim() && supabaseReady) ? '#0070f3' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!loading && lobbyCode.trim() && supabaseReady) ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Joining...' : 'Join Lobby'}
        </button>

        {!supabaseReady && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            Supabase not configured
          </div>
        )}
      </div>

      {/* Single Player Section */}
      <div style={{ marginTop: '20px' }}>
        <Link
          href="/game/single"
          style={{
            display: 'inline-block',
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#555',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Single Player (vs AI)
        </Link>
      </div>
    </div>
  );
}
