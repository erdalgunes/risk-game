import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReinforcementPhaseDelegate } from '../ReinforcementPhaseDelegate';
import { FortifyPhaseDelegate } from '../FortifyPhaseDelegate';
import type { PhaseContext } from '../PhaseDelegate';
import { createTestGame } from '@/tests/factories/game';
import { createTestPlayer } from '@/tests/factories/player';
import { createTestTerritory } from '@/tests/factories/territory';

describe('Phase Delegates', () => {
  let mockSupabase: any;
  let context: PhaseContext;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    const game = createTestGame({ phase: 'reinforcement', status: 'playing' });
    const player = createTestPlayer({ id: 'player-1', armies_available: 5 });
    const territory = createTestTerritory({
      id: 'territory-1',
      owner_id: 'player-1',
      army_count: 3,
    });

    context = {
      gameId: game.id,
      supabase: mockSupabase,
      game,
      currentPlayer: player,
      players: [player],
      territories: [territory],
    };
  });

  describe('ReinforcementPhaseDelegate', () => {
    let delegate: ReinforcementPhaseDelegate;

    beforeEach(() => {
      delegate = new ReinforcementPhaseDelegate();
    });

    describe('canExecuteAction', () => {
      it('should allow place_army action', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'player-1',
            action_type: 'place_army',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(true);
      });

      it('should allow change_phase action', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'player-1',
            action_type: 'change_phase',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(true);
      });

      it('should reject attack action', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'player-1',
            action_type: 'attack',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Only army placement');
      });

      it('should reject action from wrong player', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'other-player',
            action_type: 'place_army',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Not your turn');
      });
    });

    describe('placeArmies', () => {
      it('should successfully place armies', async () => {
        const territoryId = 'territory-1';
        const count = 3;

        // Mock RPC call for atomic placement with proper return structure
        mockSupabase.rpc.mockResolvedValueOnce({
          data: {
            success: true,
            territory_armies: 6, // 3 + 3
            player_armies_remaining: 2, // 5 - 3
            game_status: 'playing',
          },
          error: null,
        });

        const result = await delegate.placeArmies(context, 'player-1', territoryId, count);

        expect(result.success).toBe(true);
        expect(result.result).toHaveProperty('placed', count);
        expect(context.territories[0].army_count).toBe(6); // 3 + 3
        expect(context.currentPlayer.armies_available).toBe(2); // 5 - 3
      });

      it('should reject placing armies on non-owned territory', async () => {
        const territory = createTestTerritory({ id: 'territory-2', owner_id: 'other-player' });
        context.territories.push(territory);

        const result = await delegate.placeArmies(context, 'player-1', 'territory-2', 3);

        expect(result.success).toBe(false);
        expect(result.error).toContain('You do not own this territory');
      });

      it('should reject placing more armies than available', async () => {
        const result = await delegate.placeArmies(
          context,
          'player-1',
          'territory-1',
          10 // More than available (5)
        );

        expect(result.success).toBe(false);
      });

      it('should auto-transition to attack phase when armies depleted', async () => {
        context.currentPlayer.armies_available = 3;

        // Mock RPC call for atomic placement with proper return structure
        mockSupabase.rpc.mockResolvedValueOnce({
          data: {
            success: true,
            territory_armies: 6, // 3 + 3
            player_armies_remaining: 0, // All armies placed
            game_status: 'playing',
          },
          error: null,
        });

        const result = await delegate.placeArmies(context, 'player-1', 'territory-1', 3);

        expect(result.success).toBe(true);
        expect(result.transitionTo).toBe('attack');
      });

      it('should handle database errors', async () => {
        // Mock RPC call with error
        mockSupabase.rpc.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        });

        const result = await delegate.placeArmies(context, 'player-1', 'territory-1', 3);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('FortifyPhaseDelegate', () => {
    let delegate: FortifyPhaseDelegate;

    beforeEach(() => {
      delegate = new FortifyPhaseDelegate();
      context.game.phase = 'fortify';
    });

    describe('canExecuteAction', () => {
      it('should allow fortify action', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'player-1',
            action_type: 'fortify',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(true);
      });

      it('should allow end_turn action', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'player-1',
            action_type: 'end_turn',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(true);
      });

      it('should reject attack action', () => {
        const result = delegate.canExecuteAction(
          {
            id: 'action-1',
            game_id: context.gameId,
            player_id: 'player-1',
            action_type: 'attack',
            payload: {},
            created_at: new Date().toISOString(),
          },
          context
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Only fortification');
      });
    });

    describe('fortifyTerritory', () => {
      it('should successfully fortify territory', async () => {
        // Use adjacent territories that are connected
        const fromTerritory = createTestTerritory({
          id: 'territory-1',
          territory_name: 'alaska',
          owner_id: 'player-1',
          army_count: 3,
        });
        const toTerritory = createTestTerritory({
          id: 'territory-2',
          territory_name: 'northwest-territory', // Adjacent to alaska
          owner_id: 'player-1',
          army_count: 2,
        });
        context.territories = [fromTerritory, toTerritory];

        // Mock both territory updates
        mockSupabase.from.mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

        mockSupabase.from.mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

        const result = await delegate.fortifyTerritory(
          context,
          'player-1',
          fromTerritory.id,
          toTerritory.id,
          2
        );

        expect(result.success).toBe(true);
        expect(result.result).toHaveProperty('armiesMoved', 2);
        expect(fromTerritory.army_count).toBe(1); // 3 - 2
        expect(toTerritory.army_count).toBe(4); // 2 + 2
      });

      it('should reject fortifying from non-owned territory', async () => {
        const fromTerritory = createTestTerritory({
          id: 'territory-2',
          owner_id: 'other-player',
        });
        context.territories.push(fromTerritory);

        const result = await delegate.fortifyTerritory(
          context,
          'player-1',
          fromTerritory.id,
          'territory-1',
          2
        );

        expect(result.success).toBe(false);
      });

      it('should reject fortifying to non-owned territory', async () => {
        const toTerritory = createTestTerritory({
          id: 'territory-2',
          owner_id: 'other-player',
        });
        context.territories.push(toTerritory);

        const result = await delegate.fortifyTerritory(
          context,
          'player-1',
          'territory-1',
          toTerritory.id,
          2
        );

        expect(result.success).toBe(false);
      });

      it('should reject fortifying more armies than available', async () => {
        const toTerritory = createTestTerritory({
          id: 'territory-2',
          owner_id: 'player-1',
        });
        context.territories.push(toTerritory);

        const result = await delegate.fortifyTerritory(
          context,
          'player-1',
          'territory-1',
          toTerritory.id,
          5 // More than available minus 1
        );

        expect(result.success).toBe(false);
      });
    });

    describe('skipFortify', () => {
      it('should allow skipping fortify phase', async () => {
        const result = await delegate.skipFortify(context, 'player-1');

        expect(result.success).toBe(true);
        expect(result.result).toHaveProperty('skipped', true);
      });

      it('should reject skip from wrong player', async () => {
        const result = await delegate.skipFortify(context, 'other-player');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not your turn');
      });
    });
  });
});
