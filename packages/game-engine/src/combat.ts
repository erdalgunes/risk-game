/**
 * Simplified combat system for proof of concept
 * - Attacker rolls 1 die
 * - Defender rolls 1 die
 * - Highest roll wins (ties go to defender)
 * - Winner eliminates 1 troop from loser
 */

import type { AttackResult } from './types';

/**
 * Generate cryptographically secure random number between 1 and 6
 */
function rollDie(): number {
  if (typeof globalThis.crypto !== 'undefined') {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);

    // Avoid modulo bias
    const max = Math.floor(0xffffffff / 6) * 6;
    let value = array[0];

    while (value >= max) {
      globalThis.crypto.getRandomValues(array);
      value = array[0];
    }

    return (value % 6) + 1;
  }

  // Fallback for testing environments
  // NOSONAR: Math.random() fallback is only for testing, crypto.getRandomValues() is primary method
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Resolve a single round of combat
 * @param attackerTroops - Number of troops attacking (must be >= 2)
 * @param defenderTroops - Number of troops defending (must be >= 1)
 * @returns Attack result with dice rolls and casualties
 */
export function resolveCombat(
  attackerTroops: number,
  defenderTroops: number
): AttackResult {
  if (attackerTroops < 2) {
    throw new Error('Attacker must have at least 2 troops (1 must remain)');
  }

  if (defenderTroops < 1) {
    throw new Error('Defender must have at least 1 troop');
  }

  const attackerRoll = rollDie();
  const defenderRoll = rollDie();

  // Attacker must roll strictly higher to win (ties go to defender)
  const attackerWins = attackerRoll > defenderRoll;

  const attackerLoss = attackerWins ? 0 : 1;
  const defenderLoss = attackerWins ? 1 : 0;

  const conquered = defenderTroops - defenderLoss === 0;

  return {
    success: conquered,
    attackerRoll,
    defenderRoll,
    attackerLoss,
    defenderLoss,
    conquered,
  };
}

/**
 * Simulate a complete battle until one side is eliminated
 * @returns Final troop counts and number of rounds
 */
export function simulateCompleteBattle(
  attackerTroops: number,
  defenderTroops: number
): {
  attackerRemaining: number;
  defenderRemaining: number;
  rounds: number;
} {
  let attacker = attackerTroops;
  let defender = defenderTroops;
  let rounds = 0;

  while (attacker > 1 && defender > 0) {
    const result = resolveCombat(attacker, defender);
    attacker -= result.attackerLoss;
    defender -= result.defenderLoss;
    rounds++;

    // Safety check
    if (rounds > 100) {
      throw new Error('Battle exceeded maximum rounds');
    }
  }

  return {
    attackerRemaining: attacker,
    defenderRemaining: defender,
    rounds,
  };
}
