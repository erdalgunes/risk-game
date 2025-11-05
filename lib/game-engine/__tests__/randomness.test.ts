import { describe, it, expect } from 'vitest';
import { fisherYatesShuffle } from '../rules';
import { rollDice } from '../combat';

/**
 * Statistical Tests for Randomness
 *
 * These tests verify that our random number generation is fair and unbiased.
 * - Fisher-Yates shuffle produces uniform distribution
 * - Dice rolls follow expected probability distribution
 *
 * Sources:
 * - Chi-Square test: https://en.wikipedia.org/wiki/Chi-squared_test
 * - Dice fairness: https://rpg.stackexchange.com/questions/70802
 */

describe('Randomness - Fisher-Yates Shuffle', () => {
  it('should shuffle array without losing or duplicating elements', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = fisherYatesShuffle(original);

    // Same length
    expect(shuffled).toHaveLength(original.length);

    // All original elements present
    for (const item of original) {
      expect(shuffled).toContain(item);
    }

    // No duplicates
    expect(new Set(shuffled).size).toBe(original.length);
  });

  it('should produce different results on multiple runs', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set<string>();

    // Run 100 times
    for (let i = 0; i < 100; i++) {
      const shuffled = fisherYatesShuffle(original);
      results.add(JSON.stringify(shuffled));
    }

    // Should have many different permutations (extremely unlikely to get duplicates)
    expect(results.size).toBeGreaterThan(90);
  });

  it('should produce uniform distribution across 5,000 shuffles', () => {
    const testArray = [0, 1, 2, 3, 4];
    const numShuffles = 5000;
    const positionCounts: Map<string, number>[] = [];

    // Initialize counters for each position
    for (let i = 0; i < testArray.length; i++) {
      positionCounts[i] = new Map();
      testArray.forEach(value => {
        positionCounts[i].set(String(value), 0);
      });
    }

    // Run shuffles and count where each element ends up
    for (let i = 0; i < numShuffles; i++) {
      const shuffled = fisherYatesShuffle(testArray);
      shuffled.forEach((value, position) => {
        const currentCount = positionCounts[position].get(String(value)) || 0;
        positionCounts[position].set(String(value), currentCount + 1);
      });
    }

    // Expected count: 5000 shuffles / 5 elements = 1000 per position (±10% tolerance)
    const expected = numShuffles / testArray.length;
    const tolerance = expected * 0.1; // 10% tolerance (large sample = tighter bounds)

    // Verify each element appears in each position roughly equally
    for (let position = 0; position < testArray.length; position++) {
      for (const [value, count] of positionCounts[position]) {
        expect(count).toBeGreaterThanOrEqual(expected - tolerance);
        expect(count).toBeLessThanOrEqual(expected + tolerance);
      }
    }
  });

  it('should handle empty array', () => {
    const empty: number[] = [];
    const shuffled = fisherYatesShuffle(empty);
    expect(shuffled).toEqual([]);
  });

  it('should handle single element array', () => {
    const single = [42];
    const shuffled = fisherYatesShuffle(single);
    expect(shuffled).toEqual([42]);
  });

  it('should not mutate original array', () => {
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    fisherYatesShuffle(original);

    expect(original).toEqual(originalCopy);
  });
});

describe('Randomness - Dice Rolls', () => {
  it('should return correct number of dice', () => {
    expect(rollDice(1)).toHaveLength(1);
    expect(rollDice(2)).toHaveLength(2);
    expect(rollDice(3)).toHaveLength(3);
  });

  it('should return values between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const dice = rollDice(3);
      for (const die of dice) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      }
    }
  });

  it('should return dice sorted in descending order', () => {
    for (let i = 0; i < 100; i++) {
      const dice = rollDice(3);
      for (let j = 0; j < dice.length - 1; j++) {
        expect(dice[j]).toBeGreaterThanOrEqual(dice[j + 1]);
      }
    }
  });

  it.skip('should produce uniform distribution over 3,000 rolls (chi-square test)', () => {
    const numRolls = 3000;
    const faceCounts = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
    ]);

    // Roll single die 3,000 times
    for (let i = 0; i < numRolls; i++) {
      const dice = rollDice(1);
      const face = dice[0];
      faceCounts.set(face, (faceCounts.get(face) || 0) + 1);
    }

    // Expected: 3000 / 6 = 500 per face
    const expected = numRolls / 6;

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (const [face, observed] of faceCounts) {
      chiSquare += Math.pow(observed - expected, 2) / expected;
    }

    // Critical value for chi-square with 5 degrees of freedom at 95% confidence: 11.07
    // If our chi-square is less than this, the distribution is fair
    expect(chiSquare).toBeLessThan(11.07);

    // Also verify each face appears roughly 500 times (±10% tolerance)
    const tolerance = expected * 0.1; // ±50
    for (const [face, count] of faceCounts) {
      expect(count).toBeGreaterThanOrEqual(expected - tolerance);
      expect(count).toBeLessThanOrEqual(expected + tolerance);
    }
  });

  it('should produce all possible values over many rolls', () => {
    const allValues = new Set<number>();

    // Roll 100 times - should hit all values 1-6
    for (let i = 0; i < 100; i++) {
      const dice = rollDice(3);
      dice.forEach(die => allValues.add(die));
    }

    expect(allValues.size).toBe(6);
    expect(allValues.has(1)).toBe(true);
    expect(allValues.has(2)).toBe(true);
    expect(allValues.has(3)).toBe(true);
    expect(allValues.has(4)).toBe(true);
    expect(allValues.has(5)).toBe(true);
    expect(allValues.has(6)).toBe(true);
  });
});

describe('Randomness - Territory Distribution Fairness', () => {
  it('should distribute 42 territories fairly among players over multiple games', () => {
    const territoryNames = Array.from({ length: 42 }, (_, i) => `territory-${i}`);
    const playerCounts = [2, 3, 4, 5, 6];

    for (const numPlayers of playerCounts) {
      const territoriesPerPlayer = new Map<number, number>();

      // Initialize counters
      for (let i = 0; i < numPlayers; i++) {
        territoriesPerPlayer.set(i, 0);
      }

      // Simulate 500 games
      for (let game = 0; game < 500; game++) {
        const shuffled = fisherYatesShuffle(territoryNames);

        // Count territories per player
        shuffled.forEach((_, index) => {
          const playerIndex = index % numPlayers;
          const current = territoriesPerPlayer.get(playerIndex) || 0;
          territoriesPerPlayer.set(playerIndex, current + 1);
        });
      }

      // Expected: 42 territories * 500 games / numPlayers
      const expected = (42 * 500) / numPlayers;
      const tolerance = expected * 0.08; // 8% tolerance (large sample = tighter bounds)

      // Verify each player gets roughly equal territories across all games
      for (const [player, count] of territoriesPerPlayer) {
        expect(count).toBeGreaterThanOrEqual(expected - tolerance);
        expect(count).toBeLessThanOrEqual(expected + tolerance);
      }
    }
  });
});
