/**
 * BattleManager Tests
 *
 * Tests the battle orchestration system
 */

import { describe, it, expect } from 'vitest';
import { BattleManager } from '../BattleManager';
import type { Player, Territory } from '@/types/game';

// Mock data
const createMockPlayer = (id: string, username: string): Player => ({
  id,
  game_id: 'test-game',
  username,
  color: 'red',
  turn_order: 0,
  armies_available: 0,
  is_eliminated: false,
  is_ai: false,
  created_at: new Date().toISOString(),
});

const createMockTerritory = (
  id: string,
  name: string,
  owner_id: string,
  army_count: number
): Territory => ({
  id,
  game_id: 'test-game',
  territory_name: name as any,
  owner_id,
  army_count,
  updated_at: new Date().toISOString(),
});

describe('BattleManager', () => {
  describe('executeBattle', () => {
    it('should execute a battle and return AttackResult', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 5);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 3);

      const result = await BattleManager.executeBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        [attackingFrom, defendingTerritory]
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.attackerLosses).toBeGreaterThanOrEqual(0);
      expect(result.defenderLosses).toBeGreaterThanOrEqual(0);
      expect(result.attackerDice).toBeInstanceOf(Array);
      expect(result.defenderDice).toBeInstanceOf(Array);
      expect(typeof result.conquered).toBe('boolean');
    });

    it('should return valid dice rolls (1-6)', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 10);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 5);

      const result = await BattleManager.executeBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        []
      );

      // Check attacker dice
      result.attackerDice.forEach((die) => {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      });

      // Check defender dice
      result.defenderDice.forEach((die) => {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      });
    });

    it('should respect dice count limits (attacker max 3, defender max 2)', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 20);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 20);

      const result = await BattleManager.executeBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        []
      );

      expect(result.attackerDice.length).toBeLessThanOrEqual(3);
      expect(result.defenderDice.length).toBeLessThanOrEqual(2);
    });

    it('should limit attacker dice by army count minus 1', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 2); // Only 1 army can attack
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 5);

      const result = await BattleManager.executeBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        []
      );

      expect(result.attackerDice.length).toBe(1);
    });

    it('should limit defender dice by army count', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 10);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 1); // Only 1 army

      const result = await BattleManager.executeBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        []
      );

      expect(result.defenderDice.length).toBe(1);
    });

    it('should mark as conquered when defender loses all armies', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 10);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 1);

      // Run multiple battles to ensure we eventually get a conquest
      let conquered = false;
      for (let i = 0; i < 50; i++) {
        const result = await BattleManager.executeBattle(
          attacker,
          defender,
          attackingFrom,
          defendingTerritory,
          []
        );

        if (result.conquered) {
          conquered = true;
          expect(result.defenderLosses).toBe(1);
          break;
        }
      }

      // With 10 attackers vs 1 defender, conquest should happen frequently
      expect(conquered).toBe(true);
    });
  });

  describe('estimateBattleOdds', () => {
    it('should return probability between 0 and 1', () => {
      const odds = BattleManager.estimateBattleOdds(10, 5);
      expect(odds).toBeGreaterThanOrEqual(0);
      expect(odds).toBeLessThanOrEqual(1);
    });

    it('should give low odds when attacker is weaker', () => {
      const odds = BattleManager.estimateBattleOdds(2, 10);
      expect(odds).toBeLessThan(0.3);
    });

    it('should give high odds when attacker is much stronger', () => {
      const odds = BattleManager.estimateBattleOdds(20, 5);
      expect(odds).toBeGreaterThan(0.7);
    });

    it('should give good odds at ~2:1 ratio', () => {
      const odds = BattleManager.estimateBattleOdds(10, 5);
      expect(odds).toBeGreaterThanOrEqual(0.5);
      expect(odds).toBeLessThanOrEqual(0.8);
    });
  });

  describe('calculateOptimalAttackerDice', () => {
    it('should return 0 for insufficient armies', () => {
      expect(BattleManager.calculateOptimalAttackerDice(1)).toBe(0);
    });

    it('should return 1 for 2 armies', () => {
      expect(BattleManager.calculateOptimalAttackerDice(2)).toBe(1);
    });

    it('should return 3 for 4+ armies', () => {
      expect(BattleManager.calculateOptimalAttackerDice(4)).toBe(3);
      expect(BattleManager.calculateOptimalAttackerDice(10)).toBe(3);
    });

    it('should respect aggressive flag with 3 armies', () => {
      expect(BattleManager.calculateOptimalAttackerDice(3, false)).toBe(1);
      expect(BattleManager.calculateOptimalAttackerDice(3, true)).toBe(2);
    });
  });

  describe('calculateOptimalDefenderDice', () => {
    it('should return 0 for no armies', () => {
      expect(BattleManager.calculateOptimalDefenderDice(0)).toBe(0);
    });

    it('should return 1 for 1 army', () => {
      expect(BattleManager.calculateOptimalDefenderDice(1)).toBe(1);
    });

    it('should return 2 for 2+ armies', () => {
      expect(BattleManager.calculateOptimalDefenderDice(2)).toBe(2);
      expect(BattleManager.calculateOptimalDefenderDice(10)).toBe(2);
    });

    it('should respect conservative flag', () => {
      expect(BattleManager.calculateOptimalDefenderDice(5, false)).toBe(2);
      expect(BattleManager.calculateOptimalDefenderDice(5, true)).toBe(1);
    });
  });

  describe('simulateBattle', () => {
    it('should run multiple simulations and return statistics', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 10);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 5);

      const stats = await BattleManager.simulateBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        [],
        100 // 100 simulations
      );

      expect(stats.conquestProbability).toBeGreaterThanOrEqual(0);
      expect(stats.conquestProbability).toBeLessThanOrEqual(1);
      expect(stats.avgAttackerLosses).toBeGreaterThan(0);
      expect(stats.avgDefenderLosses).toBeGreaterThan(0);
    });

    it('should calculate average losses from simulations', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const strongAttackingFrom = createMockTerritory('t1', 'alaska', 'player1', 20);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 5);

      const stats = await BattleManager.simulateBattle(
        attacker,
        defender,
        strongAttackingFrom,
        defendingTerritory,
        [],
        100
      );

      // Single round battles won't conquer, but should show reasonable losses
      expect(stats.avgAttackerLosses).toBeGreaterThan(0);
      expect(stats.avgDefenderLosses).toBeGreaterThan(0);
      // On average, with 3 vs 2 dice, defender should lose more per round
      expect(stats.avgDefenderLosses).toBeGreaterThanOrEqual(stats.avgAttackerLosses * 0.8);
    });
  });

  describe('dice rolling fairness', () => {
    it('should produce dice with reasonable distribution', async () => {
      const attacker = createMockPlayer('player1', 'Alice');
      const defender = createMockPlayer('player2', 'Bob');
      const attackingFrom = createMockTerritory('t1', 'alaska', 'player1', 10);
      const defendingTerritory = createMockTerritory('t2', 'kamchatka', 'player2', 10);

      const diceCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const samples = 1000;

      // Collect dice rolls from many battles
      for (let i = 0; i < samples; i++) {
        const result = await BattleManager.executeBattle(
          attacker,
          defender,
          attackingFrom,
          defendingTerritory,
          []
        );

        result.attackerDice.forEach((die) => diceCounts[die]++);
        result.defenderDice.forEach((die) => diceCounts[die]++);
      }

      // Each die face should appear roughly 1/6 of the time
      // With large sample, each should be between 12% and 22% (allowing variance)
      const totalDice = Object.values(diceCounts).reduce((a, b) => a + b, 0);
      Object.entries(diceCounts).forEach(([face, count]) => {
        const percentage = count / totalDice;
        expect(percentage).toBeGreaterThan(0.12); // At least 12%
        expect(percentage).toBeLessThan(0.22); // At most 22%
      });
    });
  });
});
