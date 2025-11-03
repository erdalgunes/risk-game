'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getGameState } from '@/lib/supabase/queries';
import type { Game, Player, Territory } from '@/types/game';
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Hook to subscribe to game state with real-time updates
 * Enhanced with reconnection logic and error handling
 */
export function useGameState(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const fetchGameData = useCallback(async () => {
    if (!gameId) return;

    try {
      const state = await getGameState(gameId);
      setGame(state.game);
      setPlayers(state.players);
      setTerritories(state.territories);
      setError(null);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError(err as Error);
    }
  }, [gameId]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setGame(payload.new as Game);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'UPDATE') {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Player) : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'territories',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTerritories((prev) => [...prev, payload.new as Territory]);
          } else if (payload.eventType === 'UPDATE') {
            setTerritories((prev) =>
              prev.map((t) =>
                t.id === payload.new.id ? (payload.new as Territory) : t
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTerritories((prev) =>
              prev.filter((t) => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES, err) => {
        console.log('Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          setLoading(false);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error:', err);
          setConnectionStatus('disconnected');

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const backoffMs = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000
            );

            console.log(
              `Reconnecting in ${backoffMs}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );
            setConnectionStatus('reconnecting');

            setTimeout(() => {
              // Refetch data in case we missed updates
              fetchGameData();
              setupRealtimeSubscription();
            }, backoffMs);
          } else {
            setError(
              new Error(
                'Failed to connect after multiple attempts. Please refresh the page.'
              )
            );
          }
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [gameId, fetchGameData, maxReconnectAttempts]);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    fetchGameData();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gameId, fetchGameData, setupRealtimeSubscription]);

  // Refetch data when tab becomes visible (handles backgrounded tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && gameId) {
        fetchGameData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameId, fetchGameData]);

  const currentPlayer = game
    ? players.find((p) => p.turn_order === game.current_player_order) || null
    : null;

  return {
    game,
    players,
    territories,
    currentPlayer,
    loading,
    error,
    connectionStatus,
    refetch: fetchGameData,
  };
}
