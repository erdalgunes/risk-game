/**
 * @deprecated This file is deprecated. Use BattleManager from lib/battle-system instead.
 *
 * This module is kept for backward compatibility with existing tests only.
 * New code should use: import { BattleManager } from '@/lib/battle-system/BattleManager'
 *
 * The new BattleManager provides:
 * - Object-oriented battle system
 * - Modifier chain support
 * - Better testability
 * - Support for future battle types (sea, air)
 */

import type { AttackResult } from '@/types/game';

/**
 * Generate cryptographically secure random number between 1 and 6
 * Uses crypto.getRandomValues() for true randomness
 */
function rollOneDie(): number {
  // Use crypto for cryptographically secure randomness
  const array = new Uint32Array(1);

  // Works in both Node.js and browser
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto (should not happen in production)
    throw new Error('Crypto API not available');
  }

  // Convert to 1-6 range with uniform distribution
  // Avoid modulo bias by rejecting values >= 4294967280 (largest multiple of 6 below 2^32)
  const max = Math.floor(0xffffffff / 6) * 6;
  let value = array[0];

  while (value >= max) {
    globalThis.crypto.getRandomValues(array);
    value = array[0];
  }

  return (value % 6) + 1;
}

/**
 * Roll dice and return sorted results (highest to lowest)
 */
export function rollDice(count: number): number[] {
  const dice: number[] = [];
  for (let i = 0; i < count; i++) {
    dice.push(rollOneDie());
  }
  return dice.sort((a, b) => b - a); // Sort descending
}

/**
 * Resolve combat between attacker and defender
 * Returns losses for each side based on dice rolls
 */
export function resolveCombat(attackerArmies: number, defenderArmies: number): AttackResult {
  // Determine number of dice to roll
  const attackerDiceCount = Math.min(3, attackerArmies - 1); // Must leave 1 army
  const defenderDiceCount = Math.min(2, defenderArmies);

  if (attackerDiceCount < 1) {
    throw new Error('Attacker must have at least 2 armies to attack');
  }

  if (defenderDiceCount < 1) {
    throw new Error('Defender must have at least 1 army');
  }

  // Roll dice
  const attackerDice = rollDice(attackerDiceCount);
  const defenderDice = rollDice(defenderDiceCount);

  // Compare dice
  let attackerLosses = 0;
  let defenderLosses = 0;

  // Compare highest dice
  if (attackerDice[0] > defenderDice[0]) {
    defenderLosses++;
  } else {
    attackerLosses++;
  }

  // Compare second highest if both have 2+ dice
  if (attackerDice.length >= 2 && defenderDice.length >= 2) {
    if (attackerDice[1] > defenderDice[1]) {
      defenderLosses++;
    } else {
      attackerLosses++;
    }
  }

  const conquered = defenderArmies - defenderLosses <= 0;

  return {
    success: conquered,
    attackerLosses,
    defenderLosses,
    conquered,
    attackerDice,
    defenderDice,
  };
}

/**
 * Simulate multiple rounds of combat
 * Used for "attack until conquered" or statistics
 */
export function simulateBattle(
  attackerArmies: number,
  defenderArmies: number
): { attackerRemaining: number; defenderRemaining: number; rounds: number } {
  let attacker = attackerArmies;
  let defender = defenderArmies;
  let rounds = 0;

  while (attacker > 1 && defender > 0) {
    const result = resolveCombat(attacker, defender);
    attacker -= result.attackerLosses;
    defender -= result.defenderLosses;
    rounds++;

    // Safety check
    if (rounds > 1000) {
      throw new Error('Combat simulation exceeded maximum rounds');
    }
  }

  return {
    attackerRemaining: attacker,
    defenderRemaining: defender,
    rounds,
  };
}
