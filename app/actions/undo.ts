/**
 * Undo Action
 *
 * Implements undo functionality using event sourcing.
 * Allows players to revert the last game action.
 *
 * How it works:
 * 1. Get all events for the game
 * 2. Replay events up to N-1 (excluding last event)
 * 3. Update database with replayed state
 * 4. Mark last event as "undone" (or delete it)
 *
 * Limitations:
 * - Only undo last action per turn (prevent abuse)
 * - Cannot undo across turn boundaries
 * - Requires event logging to be enabled
 */

'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createEventStore } from '@/lib/event-sourcing/EventStore';
import { verifyPlayerSession } from '@/lib/session/player-session';
import { checkRateLimit, SERVER_RATE_LIMITS, getClientIP } from '@/lib/middleware/rate-limit';
import { headers } from 'next/headers';

/**
 * Undo result type
 */
export interface UndoResult {
  success: boolean;
  error?: string;
  message?: string;
  state?: {
    game: any;
    players: any[];
    territories: any[];
  };
}

/**
 * Undo the last game action
 *
 * This reverts the most recent event for the current player.
 * Uses event replay to reconstruct previous state.
 *
 * @param game_id Game ID
 * @param player_id Player requesting undo
 * @returns Result with success/error
 */
export async function undoLastAction(
  game_id: string,
  player_id: string
): Promise<UndoResult> {
  try {
    // Rate limiting
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitResult = await checkRateLimit({
      identifier: `undo:${clientIP}:${player_id}`,
      ...SERVER_RATE_LIMITS.END_TURN,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before trying again.',
      };
    }

    // Verify session
    const isSessionValid = await verifyPlayerSession(game_id, player_id);
    if (!isSessionValid) {
      return {
        success: false,
        error: 'Invalid session or unauthorized',
      };
    }

    const supabase = await createServerClient();
    const eventStore = createEventStore(supabase);

    // Get all events for this game
    const events = await eventStore.getEvents(game_id);

    if (events.length === 0) {
      return {
        success: false,
        error: 'No events to undo',
      };
    }

    // Find the last event by this player
    let lastPlayerEventIndex = -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].player_id === player_id) {
        lastPlayerEventIndex = i;
        break;
      }
    }

    if (lastPlayerEventIndex === -1) {
      return {
        success: false,
        error: 'No actions to undo',
      };
    }

    const lastEvent = events[lastPlayerEventIndex];

    // Check if event can be undone (must be recent, same turn, etc.)
    // For MVP, only allow undo of the very last event
    if (lastPlayerEventIndex !== events.length - 1) {
      return {
        success: false,
        error: 'Can only undo the most recent action',
      };
    }

    // Check event type - some events cannot be undone
    const nonUndoableEvents = [
      'game_created',
      'game_started',
      'player_joined',
      'game_finished',
      'player_eliminated',
    ];

    if (nonUndoableEvents.includes(lastEvent.event_type)) {
      return {
        success: false,
        error: `Cannot undo ${lastEvent.event_type} events`,
      };
    }

    // Replay state up to (but not including) the last event
    const targetSequence = events[lastPlayerEventIndex - 1]?.sequence_number;
    const replayedState = await eventStore.replay(game_id, targetSequence);

    // Update database with replayed state
    // This is a simplified version - full implementation would use a transaction
    try {
      // Update game
      await supabase
        .from('games')
        .update({
          status: replayedState.game.status,
          phase: replayedState.game.phase,
          current_player_order: replayedState.game.current_player_order,
          winner_id: replayedState.game.winner_id,
        })
        .eq('id', game_id);

      // Update players
      for (const player of replayedState.players) {
        await supabase
          .from('players')
          .update({
            armies_available: player.armies_available,
            is_eliminated: player.is_eliminated,
          })
          .eq('id', player.id);
      }

      // Update territories
      for (const territory of replayedState.territories) {
        await supabase
          .from('territories')
          .update({
            owner_id: territory.owner_id,
            army_count: territory.army_count,
          })
          .eq('id', territory.id);
      }

      // Mark event as undone (add metadata flag)
      // For MVP, we'll delete the event instead
      await supabase
        .from('game_events')
        .delete()
        .eq('id', lastEvent.id);

      return {
        success: true,
        message: `Undid ${lastEvent.event_type}`,
        state: replayedState,
      };
    } catch (dbError: any) {
      return {
        success: false,
        error: `Failed to update database: ${dbError.message}`,
      };
    }
  } catch (error: any) {
    console.error('Undo error:', error);
    return {
      success: false,
      error: error.message || 'Failed to undo action',
    };
  }
}

/**
 * Check if undo is available for current player
 *
 * Returns information about whether undo is available and why/why not.
 *
 * @param game_id Game ID
 * @param player_id Player ID
 * @returns Undo availability info
 */
export async function checkUndoAvailability(
  game_id: string,
  player_id: string
): Promise<{
  available: boolean;
  reason?: string;
  lastEvent?: {
    type: string;
    sequence: number;
  };
}> {
  try {
    const supabase = await createServerClient();
    const eventStore = createEventStore(supabase);

    const events = await eventStore.getEvents(game_id);

    if (events.length === 0) {
      return {
        available: false,
        reason: 'No events to undo',
      };
    }

    // Find last event by this player
    let lastPlayerEvent = null;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].player_id === player_id) {
        lastPlayerEvent = events[i];
        break;
      }
    }

    if (!lastPlayerEvent) {
      return {
        available: false,
        reason: 'No actions by this player',
      };
    }

    // Check if it's the most recent event
    if (lastPlayerEvent.id !== events[events.length - 1].id) {
      return {
        available: false,
        reason: 'Can only undo the most recent action',
      };
    }

    // Check if event type is undoable
    const nonUndoableEvents = [
      'game_created',
      'game_started',
      'player_joined',
      'game_finished',
      'player_eliminated',
    ];

    if (nonUndoableEvents.includes(lastPlayerEvent.event_type)) {
      return {
        available: false,
        reason: `Cannot undo ${lastPlayerEvent.event_type}`,
      };
    }

    return {
      available: true,
      lastEvent: {
        type: lastPlayerEvent.event_type,
        sequence: lastPlayerEvent.sequence_number,
      },
    };
  } catch (error: any) {
    console.error('Check undo availability error:', error);
    return {
      available: false,
      reason: 'Failed to check undo availability',
    };
  }
}
