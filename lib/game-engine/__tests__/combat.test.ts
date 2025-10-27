import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rollDice, resolveCombat, simulateBattle } from '../combat';

describe('Combat System', () => {
  describe('rollDice', () => {
    it('should roll the correct number of dice', () => {
      const dice = rollDice(3);
      expect(dice).toHaveLength(3);
    });

    it('should return dice values between 1 and 6', () => {
      const dice = rollDice(10);
      dice.forEach((die) => {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      });
    });

    it('should return dice sorted in descending order', () => {
      const dice = rollDice(3);
      for (let i = 0; i < dice.length - 1; i++) {
        expect(dice[i]).toBeGreaterThanOrEqual(dice[i + 1]);
      }
    });

    it('should handle rolling 1 die', () => {
      const dice = rollDice(1);
      expect(dice).toHaveLength(1);
      expect(dice[0]).toBeGreaterThanOrEqual(1);
      expect(dice[0]).toBeLessThanOrEqual(6);
    });
  });

  describe('resolveCombat', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should throw error if attacker has less than 2 armies', () => {
      expect(() => resolveCombat(1, 5)).toThrow(
        'Attacker must have at least 2 armies to attack'
      );
    });

    it('should throw error if defender has no armies', () => {
      expect(() => resolveCombat(5, 0)).toThrow('Defender must have at least 1 army');
    });

    it('should resolve combat with attacker winning highest die', () => {
      // Mock dice rolls: attacker [6], defender [3]
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.99) // Attacker die 1: 6
        .mockReturnValueOnce(0.4); // Defender die 1: 3

      const result = resolveCombat(2, 1);

      expect(result.attackerLosses).toBe(0);
      expect(result.defenderLosses).toBe(1);
      expect(result.conquered).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should resolve combat with defender winning highest die', () => {
      // Mock dice rolls: attacker [3], defender [6]
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.4) // Attacker die 1: 3
        .mockReturnValueOnce(0.99); // Defender die 1: 6

      const result = resolveCombat(2, 1);

      expect(result.attackerLosses).toBe(1);
      expect(result.defenderLosses).toBe(0);
      expect(result.conquered).toBe(false);
      expect(result.success).toBe(false);
    });

    it('should resolve combat with ties going to defender', () => {
      // Mock dice rolls: both roll 4
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5) // Attacker die 1: 4
        .mockReturnValueOnce(0.5); // Defender die 1: 4

      const result = resolveCombat(2, 1);

      expect(result.attackerLosses).toBe(1);
      expect(result.defenderLosses).toBe(0);
    });

    it('should compare two dice when both sides have enough armies', () => {
      // Setup: Attacker has 4 armies -> rolls 3 dice, Defender has 2 -> rolls 2 dice
      // Only top 2 dice from each are compared
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.99) // Attacker die 1: 6
        .mockReturnValueOnce(0.33) // Attacker die 2: 3
        .mockReturnValueOnce(0.16) // Attacker die 3: 2
        .mockReturnValueOnce(0.83) // Defender die 1: 5
        .mockReturnValueOnce(0.66); // Defender die 2: 4

      const result = resolveCombat(4, 2);

      // Attacker rolls 3 dice, defender rolls 2
      expect(result.attackerDice).toHaveLength(3);
      expect(result.defenderDice).toHaveLength(2);
      // Compare: [6,3,2] vs [5,4] -> 6>5 (defender -1), 3<4 (attacker -1)
      expect(result.attackerLosses).toBe(1);
      expect(result.defenderLosses).toBe(1);
      expect(result.conquered).toBe(false);
    });

    it('should roll 3 attacker dice with 4+ armies', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValue(0.99); // All roll 6

      const result = resolveCombat(10, 5);

      expect(result.attackerDice).toHaveLength(3);
      expect(result.defenderDice).toHaveLength(2);
    });

    it('should roll 2 defender dice with 2+ armies', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValue(0.5);

      const result = resolveCombat(4, 3);

      expect(result.attackerDice).toHaveLength(3);
      expect(result.defenderDice).toHaveLength(2);
    });

    it('should mark territory as conquered when defender has no armies left', () => {
      // Attacker: 5 armies -> rolls 3 dice, Defender: 1 army -> rolls 1 die
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.99) // Attacker die 1: 6
        .mockReturnValueOnce(0.8) // Attacker die 2: 5
        .mockReturnValueOnce(0.6) // Attacker die 3: 4
        .mockReturnValueOnce(0.1); // Defender die 1: 1

      const result = resolveCombat(5, 1);

      expect(result.conquered).toBe(true);
      expect(result.defenderLosses).toBe(1);
    });
  });

  describe('simulateBattle', () => {
    it('should simulate battle until attacker runs out of armies', () => {
      // Mock deterministic combat where defender always wins
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const result = simulateBattle(2, 10);

      expect(result.attackerRemaining).toBe(1); // Must leave 1 army
      expect(result.defenderRemaining).toBeGreaterThan(0);
      expect(result.rounds).toBeGreaterThan(0);
    });

    it('should simulate battle until defender is eliminated', () => {
      // Mock combat where attacker consistently wins more
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        // Attacker gets high rolls, defender gets low rolls
        return callCount % 2 === 1 ? 0.9 : 0.1;
      });

      const result = simulateBattle(20, 5);

      expect(result.defenderRemaining).toBe(0);
      expect(result.attackerRemaining).toBeGreaterThan(1);
      expect(result.rounds).toBeGreaterThan(0);
    });

    it('should complete battle simulation within reasonable rounds', () => {
      // With high army counts, verify it doesn't run forever
      const result = simulateBattle(50, 30);

      // Should complete without throwing
      expect(result.rounds).toBeGreaterThan(0);
      expect(result.rounds).toBeLessThan(1000);
      expect(result.attackerRemaining + result.defenderRemaining).toBeGreaterThan(0);
    });

    it('should track number of combat rounds', () => {
      const result = simulateBattle(10, 5);

      expect(result.rounds).toBeGreaterThan(0);
      expect(result.rounds).toBeLessThan(1000);
    });

    it('should handle minimum armies battle', () => {
      const result = simulateBattle(2, 1);

      expect(result.attackerRemaining + result.defenderRemaining).toBeGreaterThan(0);
      expect(result.rounds).toBeGreaterThanOrEqual(1);
    });
  });
});
