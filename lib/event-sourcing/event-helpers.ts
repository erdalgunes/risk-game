/**
 * Event Helpers
 *
 * Helper functions for logging events from game actions.
 * These ensure consistent event logging across all game operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createEventStore, type GameEventType, type BaseEvent } from './EventStore';

/**
 * Log a single game event
 *
 * @param supabase Supabase client
 * @param game_id Game ID
 * @param event_type Type of event
 * @param payload Event-specific data
 * @param player_id Optional player ID (who triggered the event)
 * @param correlation_id Optional correlation ID (link related events)
 * @returns True if successful, false otherwise
 */
export async function logGameEvent(
  supabase: SupabaseClient,
  game_id: string,
  event_type: GameEventType,
  payload: Record<string, any>,
  player_id?: string,
  correlation_id?: string
): Promise<boolean> {
  try {
    const eventStore = createEventStore(supabase);

    const event: BaseEvent = {
      event_type,
      payload,
    };

    await eventStore.appendEvent(event, {
      game_id,
      player_id: player_id || null,
      correlation_id,
    });

    return true;
  } catch (error) {
    // Log error but don't fail the action - event logging is for audit/replay
    console.error(`Failed to log event ${event_type}:`, error);
    return false;
  }
}

/**
 * Log multiple related events atomically
 *
 * Useful for complex operations like attacks that generate multiple events:
 * - territory_attacked
 * - territory_conquered (if successful)
 * - player_eliminated (if defender eliminated)
 *
 * @param supabase Supabase client
 * @param game_id Game ID
 * @param events Array of events to log
 * @param player_id Optional player ID
 * @param correlation_id Optional correlation ID (generated if not provided)
 * @returns True if successful, false otherwise
 */
export async function logGameEvents(
  supabase: SupabaseClient,
  game_id: string,
  events: Array<{ event_type: GameEventType; payload: Record<string, any> }>,
  player_id?: string,
  correlation_id?: string
): Promise<boolean> {
  try {
    const eventStore = createEventStore(supabase);

    // Generate correlation ID if not provided
    const corrId = correlation_id || crypto.randomUUID();

    const baseEvents: BaseEvent[] = events.map((e) => ({
      event_type: e.event_type,
      payload: e.payload,
    }));

    await eventStore.appendEvents(baseEvents, {
      game_id,
      player_id: player_id || null,
      correlation_id: corrId,
    });

    return true;
  } catch (error) {
    console.error('Failed to log events:', error);
    return false;
  }
}

/**
 * Event logging templates for common game actions
 * These provide consistent payload structures
 */

export const EventTemplates = {
  gameCreated: (game_id: string, max_players: number) => ({
    event_type: 'game_created' as const,
    payload: { game_id, max_players },
  }),

  gameStarted: (player_count: number, current_player_order: number) => ({
    event_type: 'game_started' as const,
    payload: { player_count, current_player_order },
  }),

  playerJoined: (player_id: string, username: string, color: string, turn_order: number) => ({
    event_type: 'player_joined' as const,
    payload: { player_id, username, color, turn_order },
  }),

  territoryClaimed: (territory_id: string, owner_id: string) => ({
    event_type: 'territory_claimed' as const,
    payload: { territory_id, owner_id },
  }),

  setupArmyPlaced: (territory_id: string, player_id: string, count: number) => ({
    event_type: 'setup_army_placed' as const,
    payload: { territory_id, player_id, count },
  }),

  turnStarted: (player_id: string, player_order: number) => ({
    event_type: 'turn_started' as const,
    payload: { player_id, player_order },
  }),

  reinforcementCalculated: (player_id: string, armies: number) => ({
    event_type: 'reinforcement_calculated' as const,
    payload: { player_id, armies },
  }),

  armyPlaced: (territory_id: string, player_id: string, count: number) => ({
    event_type: 'army_placed' as const,
    payload: { territory_id, player_id, count },
  }),

  phaseChanged: (old_phase: string, new_phase: string) => ({
    event_type: 'phase_changed' as const,
    payload: { old_phase, new_phase },
  }),

  territoryAttacked: (
    from_territory_id: string,
    to_territory_id: string,
    attacker_losses: number,
    defender_losses: number,
    attacker_dice: number[],
    defender_dice: number[]
  ) => ({
    event_type: 'territory_attacked' as const,
    payload: {
      from_territory_id,
      to_territory_id,
      attacker_losses,
      defender_losses,
      attacker_dice,
      defender_dice,
    },
  }),

  territoryConquered: (territory_id: string, new_owner_id: string, armies_moved: number) => ({
    event_type: 'territory_conquered' as const,
    payload: { territory_id, new_owner_id, armies_moved },
  }),

  playerEliminated: (player_id: string, eliminated_by: string) => ({
    event_type: 'player_eliminated' as const,
    payload: { player_id, eliminated_by },
  }),

  armyFortified: (from_territory_id: string, to_territory_id: string, count: number) => ({
    event_type: 'army_fortified' as const,
    payload: { from_territory_id, to_territory_id, count },
  }),

  turnEnded: (player_id: string, next_player_order: number) => ({
    event_type: 'turn_ended' as const,
    payload: { player_id, next_player_order },
  }),

  gameFinished: (winner_id: string) => ({
    event_type: 'game_finished' as const,
    payload: { winner_id },
  }),
};
