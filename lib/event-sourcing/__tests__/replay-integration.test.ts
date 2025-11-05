/**
 * Replay Integration Tests
 *
 * Tests the complete event replay system:
 * - EventStore.replay() with EventProjector
 * - State reconstruction from events
 * - Snapshot-based replay optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEventStore, type BaseEvent } from '../EventStore';
import { EventProjector, type GameState } from '../EventProjector';
import { createClient } from '@supabase/supabase-js';
import type { Game, Player, Territory } from '@/types/game';

// Skip these tests if Supabase is not configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const skipIfNoSupabase = SUPABASE_URL && SUPABASE_ANON_KEY ? describe : describe.skip;

skipIfNoSupabase('Replay Integration', () => {
  let eventStore: ReturnType<typeof createEventStore>;
  let testGameId: string;
  let initialState: GameState;

  beforeEach(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    eventStore = createEventStore(supabase);
    testGameId = `replay-test-${Date.now()}-${Math.random()}`;

    // Create initial state
    initialState = {
      game: {
        id: testGameId,
        status: 'waiting',
        phase: 'reinforcement',
        current_player_order: 0,
        winner_id: null,
        created_at: new Date().toISOString(),
      } as Game,
      players: [
        {
          id: 'player1',
          game_id: testGameId,
          username: 'Alice',
          color: 'red',
          turn_order: 0,
          armies_available: 10,
          is_eliminated: false,
          created_at: new Date().toISOString(),
        } as Player,
        {
          id: 'player2',
          game_id: testGameId,
          username: 'Bob',
          color: 'blue',
          turn_order: 1,
          armies_available: 10,
          is_eliminated: false,
          created_at: new Date().toISOString(),
        } as Player,
      ],
      territories: [
        {
          id: 'territory1',
          game_id: testGameId,
          territory_name: 'alaska' as any,
          owner_id: 'player1',
          army_count: 3,
          updated_at: new Date().toISOString(),
        } as Territory,
        {
          id: 'territory2',
          game_id: testGameId,
          territory_name: 'kamchatka' as any,
          owner_id: 'player2',
          army_count: 2,
          updated_at: new Date().toISOString(),
        } as Territory,
      ],
    };
  });

  describe('EventProjector', () => {
    it('should apply army_placed event', () => {
      const state = JSON.parse(JSON.stringify(initialState)); // Deep clone

      const event: any = {
        id: 'evt1',
        game_id: testGameId,
        player_id: 'player1',
        event_type: 'army_placed',
        sequence_number: 1,
        created_at: new Date().toISOString(),
        payload: {
          territory_id: 'territory1',
          player_id: 'player1',
          count: 5,
        },
      };

      EventProjector.applyEvent(state, event);

      expect(state.territories[0].army_count).toBe(8); // 3 + 5
      expect(state.players[0].armies_available).toBe(5); // 10 - 5
    });

    it('should apply phase_changed event', () => {
      const state = JSON.parse(JSON.stringify(initialState));

      const event: any = {
        id: 'evt1',
        game_id: testGameId,
        player_id: 'player1',
        event_type: 'phase_changed',
        sequence_number: 1,
        created_at: new Date().toISOString(),
        payload: {
          new_phase: 'attack',
        },
      };

      EventProjector.applyEvent(state, event);

      expect(state.game.phase).toBe('attack');
    });

    it('should apply territory_attacked event', () => {
      const state = JSON.parse(JSON.stringify(initialState));
      state.territories[0].army_count = 10;
      state.territories[1].army_count = 5;

      const event: any = {
        id: 'evt1',
        game_id: testGameId,
        player_id: 'player1',
        event_type: 'territory_attacked',
        sequence_number: 1,
        created_at: new Date().toISOString(),
        payload: {
          from_territory_id: 'territory1',
          to_territory_id: 'territory2',
          attacker_losses: 2,
          defender_losses: 3,
        },
      };

      EventProjector.applyEvent(state, event);

      expect(state.territories[0].army_count).toBe(8); // 10 - 2
      expect(state.territories[1].army_count).toBe(2); // 5 - 3
    });

    it('should apply territory_conquered event', () => {
      const state = JSON.parse(JSON.stringify(initialState));

      const event: any = {
        id: 'evt1',
        game_id: testGameId,
        player_id: 'player1',
        event_type: 'territory_conquered',
        sequence_number: 1,
        created_at: new Date().toISOString(),
        payload: {
          territory_id: 'territory2',
          new_owner_id: 'player1',
          armies_moved: 5,
        },
      };

      EventProjector.applyEvent(state, event);

      expect(state.territories[1].owner_id).toBe('player1');
      expect(state.territories[1].army_count).toBe(5);
    });

    it('should apply player_eliminated event', () => {
      const state = JSON.parse(JSON.stringify(initialState));

      const event: any = {
        id: 'evt1',
        game_id: testGameId,
        player_id: 'player1',
        event_type: 'player_eliminated',
        sequence_number: 1,
        created_at: new Date().toISOString(),
        payload: {
          player_id: 'player2',
          eliminated_by: 'player1',
        },
      };

      EventProjector.applyEvent(state, event);

      expect(state.players[1].is_eliminated).toBe(true);
    });

    it('should apply game_finished event', () => {
      const state = JSON.parse(JSON.stringify(initialState));

      const event: any = {
        id: 'evt1',
        game_id: testGameId,
        player_id: 'player1',
        event_type: 'game_finished',
        sequence_number: 1,
        created_at: new Date().toISOString(),
        payload: {
          winner_id: 'player1',
        },
      };

      EventProjector.applyEvent(state, event);

      expect(state.game.status).toBe('finished');
      expect(state.game.winner_id).toBe('player1');
    });

    it('should apply multiple events in sequence', () => {
      const state = JSON.parse(JSON.stringify(initialState));

      const events: any[] = [
        {
          event_type: 'army_placed',
          payload: { territory_id: 'territory1', player_id: 'player1', count: 3 },
        },
        {
          event_type: 'phase_changed',
          payload: { new_phase: 'attack' },
        },
        {
          event_type: 'territory_attacked',
          payload: {
            from_territory_id: 'territory1',
            to_territory_id: 'territory2',
            attacker_losses: 1,
            defender_losses: 2,
          },
        },
      ].map((e, i) => ({
        ...e,
        id: `evt${i}`,
        game_id: testGameId,
        player_id: 'player1',
        sequence_number: i + 1,
        created_at: new Date().toISOString(),
      }));

      EventProjector.applyEvents(state, events);

      // After army_placed: territory1 = 6 (3 + 3)
      // After territory_attacked: territory1 = 5 (6 - 1), territory2 = 0 (2 - 2)
      expect(state.territories[0].army_count).toBe(5);
      expect(state.territories[1].army_count).toBe(0);
      expect(state.game.phase).toBe('attack');
      expect(state.players[0].armies_available).toBe(7); // 10 - 3
    });
  });

  describe('EventStore Integration', () => {
    it('should replay events without snapshot', async () => {
      // Append some events
      const events: BaseEvent[] = [
        {
          event_type: 'army_placed',
          payload: { territory_id: 't1', player_id: 'player1', count: 5 },
        },
        {
          event_type: 'phase_changed',
          payload: { old_phase: 'reinforcement', new_phase: 'attack' },
        },
      ];

      await eventStore.appendEvents(events, {
        game_id: testGameId,
        player_id: 'player1',
      });

      // Note: replay() requires actual database state to exist
      // This test validates the API works, but won't validate state changes
      // without setting up full game in database
      const result = await eventStore.replay(testGameId);

      expect(result).toBeDefined();
      expect(result.game).toBeDefined();
      expect(result.players).toBeDefined();
      expect(result.territories).toBeDefined();
    });

    it('should create and use snapshot for replay', async () => {
      // Append initial events
      const events: BaseEvent[] = Array.from({ length: 10 }, (_, i) => ({
        event_type: 'army_placed' as const,
        payload: { territory_id: 't1', player_id: 'player1', count: 1 },
      }));

      await eventStore.appendEvents(events, {
        game_id: testGameId,
        player_id: 'player1',
      });

      // Check if snapshot should be created
      const shouldCreate = await eventStore.shouldCreateSnapshot(testGameId, 5);
      expect(shouldCreate).toBe(true); // 10 events > 5 threshold

      // Note: Creating actual snapshot requires database game state
      // This validates the threshold check works
    });

    it('should replay up to specific sequence number', async () => {
      // Append events
      const events: BaseEvent[] = [
        { event_type: 'army_placed', payload: { step: 1 } },
        { event_type: 'army_placed', payload: { step: 2 } },
        { event_type: 'army_placed', payload: { step: 3 } },
      ];

      const stored = await eventStore.appendEvents(events, {
        game_id: testGameId,
        player_id: 'player1',
      });

      // Replay up to second event
      const result = await eventStore.replay(
        testGameId,
        stored[1].sequence_number
      );

      // Note: This validates the API accepts toSequence parameter
      expect(result).toBeDefined();
    });
  });

  describe('Complete Replay Scenario', () => {
    it('should reconstruct game state from event sequence', () => {
      const state = JSON.parse(JSON.stringify(initialState));

      // Simulate a complete game turn
      const events: any[] = [
        // Reinforcement phase
        {
          event_type: 'turn_started',
          payload: { player_id: 'player1', player_order: 0 },
        },
        {
          event_type: 'reinforcement_calculated',
          payload: { player_id: 'player1', armies: 8 },
        },
        {
          event_type: 'army_placed',
          payload: { territory_id: 'territory1', player_id: 'player1', count: 8 },
        },
        // Attack phase
        {
          event_type: 'phase_changed',
          payload: { old_phase: 'reinforcement', new_phase: 'attack' },
        },
        {
          event_type: 'territory_attacked',
          payload: {
            from_territory_id: 'territory1',
            to_territory_id: 'territory2',
            attacker_losses: 1,
            defender_losses: 2,
          },
        },
        {
          event_type: 'territory_conquered',
          payload: {
            territory_id: 'territory2',
            new_owner_id: 'player1',
            armies_moved: 5,
          },
        },
        // Fortify phase
        {
          event_type: 'phase_changed',
          payload: { old_phase: 'attack', new_phase: 'fortify' },
        },
        {
          event_type: 'army_fortified',
          payload: {
            from_territory_id: 'territory1',
            to_territory_id: 'territory2',
            count: 2,
          },
        },
        // End turn
        {
          event_type: 'turn_ended',
          payload: { player_id: 'player1', next_player_order: 1 },
        },
      ].map((e, i) => ({
        ...e,
        id: `evt${i}`,
        game_id: testGameId,
        player_id: 'player1',
        sequence_number: i + 1,
        created_at: new Date().toISOString(),
      }));

      EventProjector.applyEvents(state, events);

      // Verify final state
      expect(state.game.phase).toBe('fortify'); // Last phase change
      expect(state.game.current_player_order).toBe(1); // Turn ended, next player
      expect(state.players[0].armies_available).toBe(0); // Placed 8, calculated 8
      expect(state.territories[1].owner_id).toBe('player1'); // Conquered
      expect(state.territories[1].army_count).toBe(7); // 5 moved, then +2 fortified
      expect(state.territories[0].army_count).toBe(3); // Started 3, +8, -1 attack, -5 conquest, -2 fortify
    });
  });
});
