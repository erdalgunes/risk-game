import { describe, it, expect } from 'vitest';
import {
  decidePlaceArmies,
  decideAttack,
  decideFortify,
  shouldContinueAttacking,
} from '../tutorial-ai';
import type { Player, Territory } from '@/types/game';

// Mock player factory
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'ai-player-id',
    game_id: 'game-id',
    username: 'Tutorial AI',
    color: 'red',
    turn_order: 1,
    armies_available: 5,
    is_eliminated: false,
    is_ai: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Mock territory factory
function createMockTerritory(overrides: Partial<Territory> = {}): Territory {
  return {
    id: 'territory-id',
    game_id: 'game-id',
    territory_name: 'alaska',
    owner_id: 'ai-player-id',
    army_count: 1,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('tutorial-ai', () => {
  describe('decidePlaceArmies', () => {
    it('should distribute armies evenly across weakest territories', () => {
      const aiPlayer = createMockPlayer({ armies_available: 5 });
      const territories: Territory[] = [
        createMockTerritory({
          id: 't1',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 1,
        }),
        createMockTerritory({
          id: 't2',
          territory_name: 'alberta',
          owner_id: 'ai-player-id',
          army_count: 3,
        }),
        createMockTerritory({
          id: 't3',
          territory_name: 'ontario',
          owner_id: 'ai-player-id',
          army_count: 2,
        }),
        createMockTerritory({
          id: 't4',
          territory_name: 'greenland',
          owner_id: 'player-id',
          army_count: 2,
        }), // Enemy
      ];

      const decisions = decidePlaceArmies(aiPlayer, territories);

      // Should place all 5 armies
      const totalArmies = decisions.reduce((sum, d) => sum + d.count, 0);
      expect(totalArmies).toBe(5);

      // Should prioritize weakest territories (t1 should get more than t2)
      const t1Armies = decisions.find((d) => d.territoryId === 't1')?.count || 0;
      const t2Armies = decisions.find((d) => d.territoryId === 't2')?.count || 0;
      expect(t1Armies).toBeGreaterThanOrEqual(t2Armies);

      // Should only place on AI territories (not t4)
      const enemyArmies = decisions.find((d) => d.territoryId === 't4');
      expect(enemyArmies).toBeUndefined();
    });

    it('should handle case with no armies available', () => {
      const aiPlayer = createMockPlayer({ armies_available: 0 });
      const territories: Territory[] = [
        createMockTerritory({ id: 't1', owner_id: 'ai-player-id' }),
      ];

      const decisions = decidePlaceArmies(aiPlayer, territories);

      expect(decisions).toHaveLength(0);
    });

    it('should not mutate input territories array (pure function)', () => {
      const aiPlayer = createMockPlayer({ armies_available: 3 });
      const territories: Territory[] = [
        createMockTerritory({ id: 't1', owner_id: 'ai-player-id', army_count: 1 }),
        createMockTerritory({ id: 't2', owner_id: 'ai-player-id', army_count: 2 }),
      ];

      const territoryCountsBefore = territories.map((t) => t.army_count);
      decidePlaceArmies(aiPlayer, territories);
      const territoryCountsAfter = territories.map((t) => t.army_count);

      // Army counts should not change (no mutation)
      expect(territoryCountsBefore).toEqual(territoryCountsAfter);
    });

    it('should consolidate multiple placements on same territory', () => {
      const aiPlayer = createMockPlayer({ armies_available: 5 });
      const territories: Territory[] = [
        createMockTerritory({ id: 't1', owner_id: 'ai-player-id', army_count: 1 }),
      ];

      const decisions = decidePlaceArmies(aiPlayer, territories);

      // Should return single consolidated decision
      expect(decisions).toHaveLength(1);
      expect(decisions[0].territoryId).toBe('t1');
      expect(decisions[0].count).toBe(5);
    });
  });

  describe('decideAttack', () => {
    it('should attack weakest adjacent enemy from strongest AI territory', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        createMockTerritory({
          id: 'ai1',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 5,
        }),
        createMockTerritory({
          id: 'ai2',
          territory_name: 'alberta',
          owner_id: 'ai-player-id',
          army_count: 2,
        }),
        createMockTerritory({
          id: 'enemy1',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 1,
        }), // Weakest, adjacent to Alaska
        createMockTerritory({
          id: 'enemy2',
          territory_name: 'greenland',
          owner_id: 'player-id',
          army_count: 3,
        }),
      ];

      const decision = decideAttack(aiPlayer, territories);

      expect(decision).not.toBeNull();
      expect(decision?.fromTerritoryId).toBe('ai1'); // Strongest AI territory
      expect(decision?.toTerritoryId).toBe('enemy1'); // Weakest adjacent enemy
    });

    it('should return null if no valid attacks', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        // AI territories with only 1 army (can't attack)
        createMockTerritory({
          id: 'ai1',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 1,
        }),
        createMockTerritory({
          id: 'enemy1',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 2,
        }),
      ];

      const decision = decideAttack(aiPlayer, territories);

      expect(decision).toBeNull();
    });

    it('should return null if no adjacent enemies', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        // AI controls North America, enemy controls Asia (not adjacent)
        createMockTerritory({
          id: 'ai1',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 5,
        }),
        createMockTerritory({
          id: 'enemy1',
          territory_name: 'ural',
          owner_id: 'player-id',
          army_count: 2,
        }),
      ];

      const decision = decideAttack(aiPlayer, territories);

      // Alaska and Ural are not adjacent (Alaska only connects to Kamchatka in Asia)
      // Since Kamchatka is not in the territories, there should be no valid attack
      expect(decision).toBeNull();
    });

    it('should require at least 2 armies to attack', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        createMockTerritory({
          id: 'ai1',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 2,
        }), // Can attack
        createMockTerritory({
          id: 'ai2',
          territory_name: 'alberta',
          owner_id: 'ai-player-id',
          army_count: 1,
        }), // Cannot attack
        createMockTerritory({
          id: 'enemy1',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 1,
        }),
      ];

      const decision = decideAttack(aiPlayer, territories);

      expect(decision).not.toBeNull();
      // Should attack from Alaska (2 armies), not Alberta (1 army)
      expect(decision?.fromTerritoryId).toBe('ai1');
    });
  });

  describe('shouldContinueAttacking', () => {
    it('should limit attacks to 2 per turn', () => {
      expect(shouldContinueAttacking(0)).toBe(true);
      expect(shouldContinueAttacking(1)).toBe(true);
      expect(shouldContinueAttacking(2)).toBe(false);
      expect(shouldContinueAttacking(3)).toBe(false);
    });
  });

  describe('decideFortify', () => {
    it('should move armies from rear to front-line', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        // Front-line (Alaska IS adjacent to northwest-territory)
        createMockTerritory({
          id: 'front',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 1,
        }),
        // Rear (Kamchatka is NOT adjacent to northwest-territory, but IS adjacent to Alaska)
        createMockTerritory({
          id: 'rear',
          territory_name: 'kamchatka',
          owner_id: 'ai-player-id',
          army_count: 5,
        }),
        // Enemy (Northwest Territory IS adjacent to Alaska, NOT adjacent to Kamchatka)
        createMockTerritory({
          id: 'enemy',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 2,
        }),
      ];

      const decision = decideFortify(aiPlayer, territories);

      expect(decision).not.toBeNull();
      expect(decision?.fromTerritoryId).toBe('rear'); // Move from Kamchatka (rear)
      expect(decision?.toTerritoryId).toBe('front'); // To Alaska (front-line)
      expect(decision?.count).toBe(2); // Move half (5-1)/2 = 2
    });

    it('should return null if no rear territories with 2+ armies', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        createMockTerritory({
          id: 'front',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 3,
        }),
        createMockTerritory({
          id: 'rear',
          territory_name: 'alberta',
          owner_id: 'ai-player-id',
          army_count: 1,
        }), // Only 1 army
        createMockTerritory({
          id: 'enemy',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 2,
        }),
      ];

      const decision = decideFortify(aiPlayer, territories);

      expect(decision).toBeNull();
    });

    it('should return null if no front-line territories', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        // All AI territories, no enemies adjacent
        createMockTerritory({
          id: 'ai1',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 3,
        }),
        createMockTerritory({
          id: 'ai2',
          territory_name: 'alberta',
          owner_id: 'ai-player-id',
          army_count: 5,
        }),
      ];

      const decision = decideFortify(aiPlayer, territories);

      expect(decision).toBeNull();
    });

    it('should only fortify between adjacent territories', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        // Front-line
        createMockTerritory({
          id: 'front',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 1,
        }),
        // Rear, but NOT adjacent to front-line
        createMockTerritory({
          id: 'rear',
          territory_name: 'ontario',
          owner_id: 'ai-player-id',
          army_count: 5,
        }),
        // Enemy
        createMockTerritory({
          id: 'enemy',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 2,
        }),
      ];

      const decision = decideFortify(aiPlayer, territories);

      // Alaska and Ontario are not adjacent, so no fortify
      expect(decision).toBeNull();
    });

    it('should move half the armies (rounded down)', () => {
      const aiPlayer = createMockPlayer();
      const territories: Territory[] = [
        createMockTerritory({
          id: 'front',
          territory_name: 'alaska',
          owner_id: 'ai-player-id',
          army_count: 1,
        }),
        createMockTerritory({
          id: 'rear',
          territory_name: 'kamchatka',
          owner_id: 'ai-player-id',
          army_count: 7,
        }),
        createMockTerritory({
          id: 'enemy',
          territory_name: 'northwest-territory',
          owner_id: 'player-id',
          army_count: 2,
        }),
      ];

      const decision = decideFortify(aiPlayer, territories);

      expect(decision).not.toBeNull();
      // (7 - 1) / 2 = 3
      expect(decision?.count).toBe(3);
    });
  });
});
