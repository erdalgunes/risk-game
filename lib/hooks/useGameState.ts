'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getGameState } from '@/lib/supabase/queries';
import type { Game, Player, Territory } from '@/types/game';

/**
 * Hook to subscribe to game state with real-time updates
 */
export function useGameState(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    let gameChannel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchInitialData() {
      try {
        if (!gameId) return;
        const state = await getGameState(gameId);
        setGame(state.game);
        setPlayers(state.players);
        setTerritories(state.territories);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    }

    function setupRealtimeSubscription() {
      gameChannel = supabase
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
        .subscribe();
    }

    fetchInitialData();
    setupRealtimeSubscription();

    return () => {
      if (gameChannel) {
        supabase.removeChannel(gameChannel);
      }
    };
  }, [gameId]);

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
  };
}
