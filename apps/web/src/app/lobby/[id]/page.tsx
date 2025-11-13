'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@risk-poc/database';
import type { Database } from '@risk-poc/database';
import { ensurePlayer } from '@/utils/player';
import { getLobbyPlayers, updateHeartbeat, leaveLobby, kickPlayer, startGameFromLobby } from '@/utils/lobby';

type LobbyPlayer = {
  lobby_id: string;
  player_id: string;
  player_color: string | null;
  join_order: number;
  joined_at: string | null;
  last_heartbeat: string | null;
  display_name: string;
};

type Lobby = Database['public']['Tables']['game_lobbies']['Row'];

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const lobbyId = params.id as string;

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      setSupabaseReady(true);
    } else {
      setError('Supabase not configured');
      setLoading(false);
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

  // Initialize player and load lobby
  useEffect(() => {
    if (!supabase) return;

    const init = async () => {
      try {
        // Ensure player exists
        const player = await ensurePlayer(supabase);
        setCurrentPlayer({ id: player.id, displayName: player.display_name });

        // Load lobby
        const { data: lobbyData, error: lobbyError } = await supabase
          .from('game_lobbies')
          .select('*')
          .eq('id', lobbyId)
          .single();

        if (lobbyError || !lobbyData) {
          setError('Lobby not found');
          setLoading(false);
          return;
        }

        setLobby(lobbyData);

        // Join lobby (or update heartbeat if already joined)
        const upsertData: Database['public']['Tables']['lobby_players']['Insert'] = {
          lobby_id: lobbyId,
          player_id: player.id,
          join_order: 1, // Will be corrected by the utility
          last_heartbeat: new Date().toISOString()
        };
        // Type assertion needed due to Supabase client type inference limitation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: joinError } = await (supabase as any)
          .from('lobby_players')
          .upsert(upsertData, {
            onConflict: 'lobby_id,player_id'
          });

        if (joinError) {
          console.error('Error joining lobby:', joinError);
        }

        // Load players
        const playersData = await getLobbyPlayers(supabase, lobbyId);
        setPlayers(playersData);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    };

    init();
  }, [supabase, lobbyId]);

  // Heartbeat system - ping every 10 seconds
  useEffect(() => {
    if (!supabase || !currentPlayer || !lobbyId) return;

    const interval = setInterval(async () => {
      try {
        await updateHeartbeat(supabase, lobbyId, currentPlayer.id);
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [supabase, currentPlayer, lobbyId]);

  // Subscribe to lobby updates
  useEffect(() => {
    if (!supabase || !lobbyId) return;

    const lobbyChannel = supabase
      .channel(`lobby:${lobbyId}`)
      .on<Lobby>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_lobbies',
          filter: `id=eq.${lobbyId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setLobby(payload.new as Lobby);

            // If game started, redirect to game page
            const newLobby = payload.new as Lobby;
            if (newLobby.status === 'starting' || newLobby.status === 'in_progress') {
              router.push(`/game/multi/${lobbyId}`);
            }
          } else if (payload.eventType === 'DELETE') {
            setError('Lobby was closed by host');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobbyId}`
        },
        async () => {
          // Reload player list on any change
          try {
            const playersData = await getLobbyPlayers(supabase, lobbyId);
            setPlayers(playersData);
          } catch (err) {
            console.error('Error loading players:', err);
          }
        }
      )
      .subscribe();

    return () => {
      lobbyChannel.unsubscribe();
    };
  }, [supabase, lobbyId, router]);

  const handleCopyCode = useCallback(() => {
    if (!lobby) return;
    navigator.clipboard.writeText(lobby.lobby_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [lobby]);

  const handleKickPlayer = useCallback(async (playerIdToKick: string) => {
    if (!supabase || !currentPlayer || !lobby) return;

    try {
      await kickPlayer(supabase, lobbyId, currentPlayer.id, playerIdToKick);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [supabase, currentPlayer, lobby, lobbyId]);

  const handleLeaveLobby = useCallback(async () => {
    if (!supabase || !currentPlayer) return;

    try {
      await leaveLobby(supabase, lobbyId, currentPlayer.id);
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [supabase, currentPlayer, lobbyId, router]);

  const handleStartGame = useCallback(async () => {
    if (!supabase || !currentPlayer || !lobby) return;

    try {
      await startGameFromLobby(supabase, lobbyId, currentPlayer.id);
      // Will redirect via subscription
    } catch (err) {
      setError((err as Error).message);
    }
  }, [supabase, currentPlayer, lobby, lobbyId]);

  const isHost = currentPlayer && lobby && lobby.host_player_id === currentPlayer.id;
  const canStartGame = isHost && players.length >= 2;

  if (!supabaseReady) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Supabase Not Configured</h1>
          <p style={{ color: '#888', marginTop: '20px' }}>
            Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '40px',
              padding: '10px 20px',
              backgroundColor: '#555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading lobby...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Error</h1>
          <p style={{ color: '#ff6b6b', marginTop: '20px' }}>{error}</p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '40px',
              padding: '10px 20px',
              backgroundColor: '#555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{ color: 'white', margin: 0 }}>Game Lobby</h1>
          <Link
            href="/"
            style={{
              padding: '10px 20px',
              backgroundColor: '#555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            Back to Menu
          </Link>
        </div>

        {/* Lobby Code */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#888', fontSize: '14px', marginBottom: '10px' }}>
            Share this code with your friends:
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
            letterSpacing: '8px',
            marginBottom: '20px',
            fontFamily: 'monospace'
          }}>
            {lobby?.lobby_code}
          </div>
          <button
            onClick={handleCopyCode}
            style={{
              padding: '10px 30px',
              fontSize: '16px',
              backgroundColor: copied ? '#10b981' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Player List */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: 'white', marginTop: 0, marginBottom: '20px' }}>
            Players ({players.length}/{lobby?.max_players})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {players.map((player) => (
              <div
                key={player.player_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '8px',
                  border: player.player_id === currentPlayer?.id ? '2px solid #0070f3' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {/* Color indicator */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: player.player_color || '#666',
                      border: '2px solid white'
                    }}
                  />
                  <div>
                    <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                      {player.display_name}
                      {player.player_id === currentPlayer?.id && ' (You)'}
                      {player.player_id === lobby?.host_player_id && ' 👑'}
                    </div>
                    <div style={{ color: '#888', fontSize: '14px' }}>
                      {player.player_color || 'No color assigned'}
                    </div>
                  </div>
                </div>
                {/* Kick button for host */}
                {isHost && player.player_id !== currentPlayer?.id && (
                  <button
                    onClick={() => handleKickPlayer(player.player_id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connection Status */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '15px 20px',
          borderRadius: '8px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              animation: 'pulse 2s infinite'
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
          <span style={{ color: '#888', fontSize: '14px' }}>Connected</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px' }}>
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              style={{
                flex: 1,
                padding: '15px',
                fontSize: '18px',
                backgroundColor: canStartGame ? '#10b981' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: canStartGame ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              {canStartGame ? 'Start Game' : 'Need at least 2 players'}
            </button>
          ) : (
            <div style={{
              flex: 1,
              padding: '15px',
              fontSize: '16px',
              backgroundColor: '#2a2a2a',
              color: '#888',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              Waiting for host to start the game...
            </div>
          )}
          <button
            onClick={handleLeaveLobby}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
