import type { AttackResult } from '@/types/game';

/**
 * Roll dice and return sorted results (highest to lowest)
 */
export function rollDice(count: number): number[] {
  const dice: number[] = [];
  for (let i = 0; i < count; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice.sort((a, b) => b - a); // Sort descending
}

/**
 * Resolve combat between attacker and defender
 * Returns losses for each side based on dice rolls
 */
export function resolveCombat(
  attackerArmies: number,
  defenderArmies: number
): AttackResult {
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
