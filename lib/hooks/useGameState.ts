'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getGameState } from '@/lib/supabase/queries';
import type { Game, Player, Territory } from '@/types/game';
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'polling';

/**
 * Hook to subscribe to game state with real-time updates
 * Enhanced with reconnection logic, error handling, and polling fallback
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const pollingIntervalMs = 5000; // Poll every 5 seconds when WebSocket fails

  const fetchGameData = useCallback(async () => {
    if (!gameId) return;

    try {
      const state = await getGameState(gameId);
      setGame(state.game);
      setPlayers(state.players);
      setTerritories(state.territories);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError(err as Error);
      return false;
    }
  }, [gameId]);

  const startPollingFallback = useCallback(() => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Starting polling fallback (WebSocket unavailable)
    setConnectionStatus('polling');

    // Poll immediately
    fetchGameData();

    // Then poll at regular intervals
    pollingIntervalRef.current = setInterval(() => {
      fetchGameData();
    }, pollingIntervalMs);
  }, [fetchGameData, pollingIntervalMs]);

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

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
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Player) : p))
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
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Territory) : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTerritories((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES, err) => {
        // Realtime connection status updated
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          stopPollingFallback(); // Stop polling if we reconnected
          setLoading(false);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error:', err);
          setConnectionStatus('disconnected');

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

            // Reconnecting with exponential backoff
            setConnectionStatus('reconnecting');

            setTimeout(() => {
              // Refetch data in case we missed updates
              fetchGameData();
              setupRealtimeSubscription();
            }, backoffMs);
          } else {
            // All reconnection attempts failed, fall back to polling
            console.warn('All reconnection attempts failed, using polling fallback');
            startPollingFallback();
          }
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [gameId, fetchGameData, maxReconnectAttempts, startPollingFallback, stopPollingFallback]);

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
      stopPollingFallback();
    };
  }, [gameId, fetchGameData, setupRealtimeSubscription, stopPollingFallback]);

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
