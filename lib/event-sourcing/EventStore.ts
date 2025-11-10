/**
 * EventStore
 *
 * Central class for event sourcing operations:
 * - Append events to immutable log
 * - Replay events to reconstruct state
 * - Create snapshots for performance
 * - Validate event sequences
 *
 * Follows CQRS pattern:
 * - Commands → Events → State
 * - Read from current state tables
 * - Write to event log
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game, Player, Territory } from '@/types/game';
import { EventProjector } from './EventProjector';
import { validateEventPayload } from './event-schemas';

/**
 * Base interface for all events
 * All events must extend this
 */
export interface BaseEvent {
  event_type: GameEventType;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * All possible event types in the system
 */
export type GameEventType =
  | 'game_created'
  | 'game_started'
  | 'player_joined'
  | 'territory_claimed'
  | 'setup_army_placed'
  | 'turn_started'
  | 'reinforcement_calculated'
  | 'army_placed'
  | 'phase_changed'
  | 'territory_attacked'
  | 'territory_conquered'
  | 'player_eliminated'
  | 'army_fortified'
  | 'turn_ended'
  | 'game_finished';

/**
 * Event with persistence metadata
 */
export interface StoredEvent extends BaseEvent {
  id: string;
  game_id: string;
  player_id: string | null;
  sequence_number: number;
  created_at: string;
  correlation_id?: string;
  causation_id?: string;
}

/**
 * Game state snapshot
 */
export interface GameSnapshot {
  id: string;
  game_id: string;
  sequence_number: number;
  game_state: {
    game: Game;
    players: Player[];
    territories: Territory[];
  };
  created_at: string;
}

/**
 * Options for appending events
 */
export interface AppendEventOptions {
  game_id: string;
  player_id?: string | null;
  correlation_id?: string;
  causation_id?: string;
  metadata?: Record<string, any>;
}

/**
 * EventStore class - manages all event sourcing operations
 */
export class EventStore {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Append an event to the immutable log
   *
   * @param event The event to append
   * @param options Event metadata (game_id, player_id, etc.)
   * @returns The stored event with sequence number
   */
  async appendEvent(event: BaseEvent, options: AppendEventOptions): Promise<StoredEvent> {
    // Validate event payload
    const validation = validateEventPayload(event.event_type, event.payload);
    if (!validation.success) {
      throw new Error(`Event validation failed: ${validation.error}`);
    }

    const { data, error } = await this.supabase
      .from('game_events')
      .insert({
        game_id: options.game_id,
        player_id: options.player_id || null,
        event_type: event.event_type,
        payload: validation.data, // Use validated data
        metadata: event.metadata || {},
        correlation_id: options.correlation_id,
        causation_id: options.causation_id,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to append event: ${error.message}`);
    }

    return data as StoredEvent;
  }

  /**
   * Append multiple events atomically
   * All succeed or all fail
   *
   * @param events Array of events to append
   * @param options Event metadata
   * @returns Array of stored events
   */
  async appendEvents(events: BaseEvent[], options: AppendEventOptions): Promise<StoredEvent[]> {
    if (events.length === 0) return [];

    // Validate all events first
    const validatedEvents = events.map((event) => {
      const validation = validateEventPayload(event.event_type, event.payload);
      if (!validation.success) {
        throw new Error(`Event validation failed for ${event.event_type}: ${validation.error}`);
      }
      return { ...event, payload: validation.data };
    });

    const inserts = validatedEvents.map((event) => ({
      game_id: options.game_id,
      player_id: options.player_id || null,
      event_type: event.event_type,
      payload: event.payload,
      metadata: event.metadata || {},
      correlation_id: options.correlation_id,
      causation_id: options.causation_id,
    }));

    const { data, error } = await this.supabase.from('game_events').insert(inserts).select('*');

    if (error) {
      throw new Error(`Failed to append events: ${error.message}`);
    }

    return data as StoredEvent[];
  }

  /**
   * Get all events for a game
   *
   * @param game_id The game ID
   * @param fromSequence Start from this sequence number (default: 0)
   * @returns Array of events in order
   */
  async getEvents(game_id: string, fromSequence: number = 0): Promise<StoredEvent[]> {
    const { data, error } = await this.supabase.rpc('get_game_events', {
      p_game_id: game_id,
      p_from_sequence: fromSequence,
    });

    if (error) {
      throw new Error(`Failed to get events: ${error.message}`);
    }

    return (data || []) as StoredEvent[];
  }

  /**
   * Get events by type for a game
   * Useful for analytics (e.g., "show all attacks")
   *
   * @param game_id The game ID
   * @param event_type Filter by event type
   * @returns Array of matching events
   */
  async getEventsByType(game_id: string, event_type: GameEventType): Promise<StoredEvent[]> {
    const { data, error } = await this.supabase
      .from('game_events')
      .select('*')
      .eq('game_id', game_id)
      .eq('event_type', event_type)
      .order('sequence_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to get events by type: ${error.message}`);
    }

    return (data || []) as StoredEvent[];
  }

  /**
   * Get events by correlation ID
   * Finds all related events (e.g., attack -> conquest -> elimination)
   *
   * @param correlation_id The correlation ID
   * @returns Array of related events
   */
  async getEventsByCorrelation(correlation_id: string): Promise<StoredEvent[]> {
    const { data, error } = await this.supabase
      .from('game_events')
      .select('*')
      .eq('correlation_id', correlation_id)
      .order('sequence_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to get correlated events: ${error.message}`);
    }

    return (data || []) as StoredEvent[];
  }

  /**
   * Get the latest snapshot for a game
   *
   * @param game_id The game ID
   * @returns The latest snapshot or null
   */
  async getLatestSnapshot(game_id: string): Promise<GameSnapshot | null> {
    const { data, error } = await this.supabase.rpc('get_latest_snapshot', {
      p_game_id: game_id,
    });

    if (error) {
      throw new Error(`Failed to get snapshot: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    const snapshot = data[0];
    return {
      id: snapshot.snapshot_id,
      game_id,
      sequence_number: snapshot.sequence_number,
      game_state: snapshot.game_state,
      created_at: new Date().toISOString(), // Will be set by actual query
    } as GameSnapshot;
  }

  /**
   * Create a snapshot of current game state
   * Should be called periodically (e.g., every 50 events)
   *
   * @param game_id The game ID
   * @returns The created snapshot ID
   */
  async createSnapshot(game_id: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('create_game_snapshot', {
      p_game_id: game_id,
    });

    if (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Check if a snapshot should be created
   * Returns true if more than threshold events since last snapshot
   *
   * @param game_id The game ID
   * @param threshold Number of events before snapshot (default: 50)
   * @returns True if snapshot should be created
   */
  async shouldCreateSnapshot(game_id: string, threshold: number = 50): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('events_since_snapshot', {
      p_game_id: game_id,
    });

    if (error) {
      console.error('Failed to check snapshot threshold:', error);
      return false;
    }

    return (data as number) >= threshold;
  }

  /**
   * Replay events to reconstruct game state
   * Starts from latest snapshot if available, otherwise from beginning
   *
   * @param game_id The game ID
   * @param toSequence Replay up to this sequence (optional)
   * @returns Reconstructed game state
   */
  async replay(
    game_id: string,
    toSequence?: number
  ): Promise<{
    game: Game;
    players: Player[];
    territories: Territory[];
  }> {
    const startTime = performance.now();

    // Get latest snapshot (if any)
    const snapshot = await this.getLatestSnapshot(game_id);
    let state = snapshot?.game_state || null;
    let fromSequence = snapshot?.sequence_number || 0;

    // Get events since snapshot
    const events = await this.getEvents(game_id, fromSequence);

    // Filter events if toSequence specified
    const eventsToReplay = toSequence
      ? events.filter((e) => e.sequence_number <= toSequence)
      : events;

    // Monitoring: Calculate snapshot effectiveness
    const snapshotSavedEvents = snapshot ? fromSequence : 0;
    const eventsToReplayCount = eventsToReplay.length;
    const snapshotEffectiveness = snapshot
      ? `${((snapshotSavedEvents / (snapshotSavedEvents + eventsToReplayCount)) * 100).toFixed(1)}%`
      : 'N/A (no snapshot)';

    // If no snapshot, we need to build initial state from current DB
    if (!state) {
      const [gameResult, playersResult, territoriesResult] = await Promise.all([
        this.supabase.from('games').select('*').eq('id', game_id).single(),
        this.supabase.from('players').select('*').eq('game_id', game_id).order('turn_order'),
        this.supabase.from('territories').select('*').eq('game_id', game_id),
      ]);

      if (gameResult.error) throw gameResult.error;
      if (playersResult.error) throw playersResult.error;
      if (territoriesResult.error) throw territoriesResult.error;

      state = {
        game: gameResult.data as Game,
        players: playersResult.data as Player[],
        territories: territoriesResult.data as Territory[],
      };
    }

    // Replay events to reconstruct state using EventProjector
    const projectionStartTime = performance.now();
    if (eventsToReplay.length > 0) {
      state = EventProjector.applyEvents(state, eventsToReplay);
    }
    const projectionDuration = performance.now() - projectionStartTime;

    const totalDuration = performance.now() - startTime;

    // Monitoring: Log performance metrics
    console.log(`[EventStore] Replay completed for game ${game_id}:`, {
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      projectionDuration: `${projectionDuration.toFixed(2)}ms`,
      eventsReplayed: eventsToReplayCount,
      snapshotUsed: !!snapshot,
      snapshotEffectiveness,
      eventsPerMs:
        eventsToReplayCount > 0 ? (eventsToReplayCount / projectionDuration).toFixed(2) : 'N/A',
    });

    // Monitoring: Warn about slow replays
    if (totalDuration > 1000) {
      console.warn(
        `[EventStore] Slow replay detected (${totalDuration.toFixed(2)}ms) for game ${game_id}. ` +
          `Consider creating a snapshot (${eventsToReplayCount} events replayed).`
      );
    }

    return state;
  }

  /**
   * Validate event sequence for a game
   * Checks for gaps, duplicates, and consistency
   *
   * @param game_id The game ID
   * @returns Validation result with any issues found
   */
  async validateEventSequence(game_id: string): Promise<{ valid: boolean; issues: string[] }> {
    const events = await this.getEvents(game_id);
    const issues: string[] = [];

    if (events.length === 0) {
      return { valid: true, issues: [] };
    }

    // Check for sequence gaps
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1].sequence_number;
      const curr = events[i].sequence_number;

      if (curr !== prev + 1) {
        issues.push(`Sequence gap: ${prev} -> ${curr}`);
      }
    }

    // Check for duplicate sequences
    const sequences = new Set<number>();
    for (const event of events) {
      if (sequences.has(event.sequence_number)) {
        issues.push(`Duplicate sequence: ${event.sequence_number}`);
      }
      sequences.add(event.sequence_number);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get event statistics for a game
   * Useful for analytics and monitoring
   *
   * @param game_id The game ID
   * @returns Event statistics
   */
  async getEventStats(game_id: string): Promise<{
    total_events: number;
    events_by_type: Record<string, number>;
    first_event: string | null;
    last_event: string | null;
  }> {
    const events = await this.getEvents(game_id);

    const events_by_type: Record<string, number> = {};
    for (const event of events) {
      events_by_type[event.event_type] = (events_by_type[event.event_type] || 0) + 1;
    }

    return {
      total_events: events.length,
      events_by_type,
      first_event: events[0]?.created_at || null,
      last_event: events[events.length - 1]?.created_at || null,
    };
  }
}

/**
 * Factory function to create EventStore instance
 *
 * @param supabase Supabase client
 * @returns EventStore instance
 */
export function createEventStore(supabase: SupabaseClient): EventStore {
  return new EventStore(supabase);
}
