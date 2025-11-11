/**
 * Simplified combat system for proof of concept
 * - Attacker rolls 1 die
 * - Defender rolls 1 die
 * - Highest roll wins (ties go to defender)
 * - Winner eliminates 1 troop from loser
 */
import type { AttackResult } from './types';
/**
 * Resolve a single round of combat
 * @param attackerTroops - Number of troops attacking (must be >= 2)
 * @param defenderTroops - Number of troops defending (must be >= 1)
 * @returns Attack result with dice rolls and casualties
 */
export declare function resolveCombat(attackerTroops: number, defenderTroops: number): AttackResult;
/**
 * Simulate a complete battle until one side is eliminated
 * @returns Final troop counts and number of rounds
 */
export declare function simulateCompleteBattle(attackerTroops: number, defenderTroops: number): {
    attackerRemaining: number;
    defenderRemaining: number;
    rounds: number;
};
