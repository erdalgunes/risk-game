import { describe, it, expect } from 'vitest';
import {
  canAttack,
  canFortify,
  canPlaceArmies,
  isPlayerTurn,
  areTerritoriesConnected,
} from '../validation';
import { createTestGame } from '@/tests/factories/game';
import { createTestPlayer } from '@/tests/factories/player';
import { createTestTerritory, createAdjacentTerritories } from '@/tests/factories/territory';

describe('Game Validation', () => {
  describe('canAttack', () => {
    it('should allow valid attack', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });
      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'kamchatka',
        player.id,
        'enemy-id',
        2,
        1
      );

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject attack not in attack phase', () => {
      const game = createTestGame({ phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });
      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'kamchatka',
        player.id,
        'enemy-id',
        2,
        1
      );

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not in attack phase');
    });

    it('should reject attack when not current player', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 1 }); // Wrong turn
      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'kamchatka',
        player.id,
        'enemy-id',
        2,
        1
      );

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not your turn');
    });

    it('should reject attack from territory not owned by player', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });
      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'kamchatka',
        'enemy-id', // Enemy owns source
        'enemy-id-2',
        2,
        1
      );

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('You do not own the attacking territory');
    });

    it('should reject attack on own territory', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });
      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'kamchatka',
        player.id,
        player.id, // Player owns both
        2,
        1
      );

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot attack your own territory');
    });

    it('should reject attack with insufficient armies', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });
      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'kamchatka',
        player.id,
        'enemy-id',
        1, // Only 1 army
        1
      );

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Must have at least 2 armies to attack');
    });

    it('should reject attack on non-adjacent territory', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      // Alaska and Brazil are not adjacent
      const fromTerritory = createTestTerritory({
        game_id: game.id,
        territory_name: 'alaska',
        owner_id: player.id,
        army_count: 5,
      });

      const toTerritory = createTestTerritory({
        game_id: game.id,
        territory_name: 'brazil',
        owner_id: 'enemy-id',
        army_count: 1,
      });

      const result = canAttack(game, player, fromTerritory, toTerritory);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Territories are not adjacent');
    });
  });

  describe('canFortify', () => {
    it('should allow valid fortification', () => {
      const game = createTestGame({ phase: 'fortify', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'alberta',
        player.id,
        player.id,
        3,
        1
      );

      const allTerritories = [fromTerritory, toTerritory];

      const result = canFortify(game, player, fromTerritory, toTerritory, 2, allTerritories);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject fortify not in fortify phase', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'alberta',
        player.id,
        player.id,
        3,
        1
      );

      const result = canFortify(game, player, fromTerritory, toTerritory, 2, [fromTerritory, toTerritory]);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not in fortify phase');
    });

    it('should reject fortify when not current player', () => {
      const game = createTestGame({ phase: 'fortify', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 1 });

      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'alberta',
        player.id,
        player.id,
        3,
        1
      );

      const result = canFortify(game, player, fromTerritory, toTerritory, 2, [fromTerritory, toTerritory]);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not your turn');
    });

    it('should reject fortify from territory not owned', () => {
      const game = createTestGame({ phase: 'fortify', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'alberta',
        'enemy-id',
        player.id,
        3,
        1
      );

      const result = canFortify(game, player, fromTerritory, toTerritory, 2, [fromTerritory, toTerritory]);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('You do not own the source territory');
    });

    it('should reject fortify to territory not owned', () => {
      const game = createTestGame({ phase: 'fortify', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'alberta',
        player.id,
        'enemy-id',
        3,
        1
      );

      const result = canFortify(game, player, fromTerritory, toTerritory, 2, [fromTerritory, toTerritory]);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('You do not own the destination territory');
    });

    it('should reject fortify that leaves source with no armies', () => {
      const game = createTestGame({ phase: 'fortify', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      const [fromTerritory, toTerritory] = createAdjacentTerritories(
        game.id,
        'alaska',
        'alberta',
        player.id,
        player.id,
        3,
        1
      );

      const result = canFortify(game, player, fromTerritory, toTerritory, 3, [fromTerritory, toTerritory]);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Must leave at least 1 army in source territory');
    });

    it('should reject fortify to disconnected territory', () => {
      const game = createTestGame({ phase: 'fortify', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      // Alaska and Brazil - not connected
      const fromTerritory = createTestTerritory({
        game_id: game.id,
        territory_name: 'alaska',
        owner_id: player.id,
        army_count: 5,
      });

      const toTerritory = createTestTerritory({
        game_id: game.id,
        territory_name: 'brazil',
        owner_id: player.id,
        army_count: 1,
      });

      const allTerritories = [fromTerritory, toTerritory];

      const result = canFortify(game, player, fromTerritory, toTerritory, 2, allTerritories);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Territories are not connected through your territories');
    });
  });

  describe('canPlaceArmies', () => {
    it('should allow valid army placement in reinforcement phase', () => {
      const game = createTestGame({ phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0, armies_available: 5 });
      const territory = createTestTerritory({ owner_id: player.id });

      const result = canPlaceArmies(game, player, territory, 3);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow valid army placement in setup phase', () => {
      const game = createTestGame({ status: 'setup', phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0, armies_available: 5 });
      const territory = createTestTerritory({ owner_id: player.id });

      const result = canPlaceArmies(game, player, territory, 3);

      expect(result.valid).toBe(true);
    });

    it('should reject placement not in reinforcement or setup', () => {
      const game = createTestGame({ phase: 'attack', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0, armies_available: 5 });
      const territory = createTestTerritory({ owner_id: player.id });

      const result = canPlaceArmies(game, player, territory, 3);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not in reinforcement or setup phase');
    });

    it('should reject placement when not current player', () => {
      const game = createTestGame({ phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 1, armies_available: 5 });
      const territory = createTestTerritory({ owner_id: player.id });

      const result = canPlaceArmies(game, player, territory, 3);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not your turn');
    });

    it('should reject placement on territory not owned', () => {
      const game = createTestGame({ phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0, armies_available: 5 });
      const territory = createTestTerritory({ owner_id: 'enemy-id' });

      const result = canPlaceArmies(game, player, territory, 3);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('You do not own this territory');
    });

    it('should reject placement with insufficient armies', () => {
      const game = createTestGame({ phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0, armies_available: 2 });
      const territory = createTestTerritory({ owner_id: player.id });

      const result = canPlaceArmies(game, player, territory, 5);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not enough armies available (have 2, need 5)');
    });

    it('should reject placement with zero or negative armies', () => {
      const game = createTestGame({ phase: 'reinforcement', current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0, armies_available: 5 });
      const territory = createTestTerritory({ owner_id: player.id });

      const result = canPlaceArmies(game, player, territory, 0);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Must place at least 1 army');
    });
  });

  describe('isPlayerTurn', () => {
    it('should return true when it is player turn', () => {
      const game = createTestGame({ current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 0 });

      const result = isPlayerTurn(game, player);

      expect(result).toBe(true);
    });

    it('should return false when it is not player turn', () => {
      const game = createTestGame({ current_player_order: 0 });
      const player = createTestPlayer({ turn_order: 1 });

      const result = isPlayerTurn(game, player);

      expect(result).toBe(false);
    });
  });

  describe('areTerritoriesConnected', () => {
    it('should return true for same territory', () => {
      const territory = createTestTerritory({ territory_name: 'alaska' });

      const result = areTerritoriesConnected(territory, territory, 'player-id', [territory]);

      expect(result).toBe(true);
    });

    it('should return true for adjacent territories owned by player', () => {
      const playerId = 'player-1';
      const territory1 = createTestTerritory({
        territory_name: 'alaska',
        owner_id: playerId,
      });
      const territory2 = createTestTerritory({
        territory_name: 'alberta',
        owner_id: playerId,
      });

      const result = areTerritoriesConnected(territory1, territory2, playerId, [territory1, territory2]);

      expect(result).toBe(true);
    });

    it('should return true for territories connected through chain', () => {
      const playerId = 'player-1';

      // Alaska -> Alberta -> Ontario (all owned by player)
      const alaska = createTestTerritory({
        territory_name: 'alaska',
        owner_id: playerId,
      });
      const alberta = createTestTerritory({
        territory_name: 'alberta',
        owner_id: playerId,
      });
      const ontario = createTestTerritory({
        territory_name: 'ontario',
        owner_id: playerId,
      });

      const allTerritories = [alaska, alberta, ontario];

      const result = areTerritoriesConnected(alaska, ontario, playerId, allTerritories);

      expect(result).toBe(true);
    });

    it('should return false if path is blocked by enemy territory', () => {
      const playerId = 'player-1';

      const alaska = createTestTerritory({
        territory_name: 'alaska',
        owner_id: playerId,
      });
      const alberta = createTestTerritory({
        territory_name: 'alberta',
        owner_id: 'enemy-id', // Enemy controls middle
      });
      const ontario = createTestTerritory({
        territory_name: 'ontario',
        owner_id: playerId,
      });

      const allTerritories = [alaska, alberta, ontario];

      const result = areTerritoriesConnected(alaska, ontario, playerId, allTerritories);

      expect(result).toBe(false);
    });

    it('should return false for completely disconnected territories', () => {
      const playerId = 'player-1';

      const alaska = createTestTerritory({
        territory_name: 'alaska',
        owner_id: playerId,
      });
      const brazil = createTestTerritory({
        territory_name: 'brazil',
        owner_id: playerId,
      });

      const result = areTerritoriesConnected(alaska, brazil, playerId, [alaska, brazil]);

      expect(result).toBe(false);
    });
  });
});
