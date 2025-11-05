/**
 * BattleManager
 *
 * Orchestrates battles using the battle system:
 * - Creates appropriate battle types (land, sea, air - future)
 * - Applies modifiers automatically
 * - Manages battle lifecycle
 * - Provides clean API for game actions
 *
 * This is the main entry point for combat resolution.
 */

import type { Player, Territory, AttackResult } from '@/types/game';
import type { BattleContext } from './AbstractBattle';
import { LandBattle, createLandBattle } from './LandBattle';
import { getApplicableModifiers } from './modifiers/CombatModifiers';

/**
 * Battle type enum
 */
export type BattleType = 'land' | 'sea' | 'air';

/**
 * Battle Manager - coordinates all combat operations
 */
export class BattleManager {
  /**
   * Execute a battle between territories
   *
   * This is the main method used by game actions.
   * It automatically:
   * - Creates the appropriate battle type
   * - Applies applicable modifiers
   * - Executes the battle
   * - Returns results in AttackResult format
   *
   * @param attacker Attacking player
   * @param defender Defending player
   * @param attackingFrom Attacking territory
   * @param defendingTerritory Defending territory
   * @param allTerritories All territories (for context)
   * @param battleType Type of battle (default: 'land')
   * @returns AttackResult compatible with existing code
   */
  static async executeBattle(
    attacker: Player,
    defender: Player,
    attackingFrom: Territory,
    defendingTerritory: Territory,
    allTerritories: Territory[],
    battleType: BattleType = 'land'
  ): Promise<AttackResult> {
    // Build battle context
    const context: BattleContext = {
      attacker,
      defender,
      attackingFrom,
      defendingTerritory,
      allTerritories,
    };

    // Create battle instance
    const battle = this.createBattle(battleType, context);

    // Apply modifiers
    const modifiers = getApplicableModifiers(context);
    for (const modifier of modifiers) {
      battle.addModifier(modifier);
    }

    // Execute battle
    const outcome = await battle.execute();

    // Convert to AttackResult format for backward compatibility
    return {
      success: outcome.success,
      attackerLosses: outcome.attackerLosses,
      defenderLosses: outcome.defenderLosses,
      conquered: outcome.conquered,
      attackerDice: outcome.attackerDice,
      defenderDice: outcome.defenderDice,
    };
  }

  /**
   * Create a battle instance based on type
   *
   * @param type Battle type
   * @param context Battle context
   * @returns Battle instance
   */
  private static createBattle(
    type: BattleType,
    context: BattleContext
  ): LandBattle {
    switch (type) {
      case 'land':
        return createLandBattle(context);
      case 'sea':
        // Future: return createSeaBattle(context);
        throw new Error('Sea battles not implemented yet');
      case 'air':
        // Future: return createAirBattle(context);
        throw new Error('Air battles not implemented yet');
      default:
        throw new Error(`Unknown battle type: ${type}`);
    }
  }

  /**
   * Simulate a battle without executing it
   * Useful for AI or "what-if" analysis
   *
   * @param attacker Attacking player
   * @param defender Defending player
   * @param attackingFrom Attacking territory
   * @param defendingTerritory Defending territory
   * @param allTerritories All territories
   * @param simulations Number of simulations to run
   * @returns Probability of conquest and average losses
   */
  static async simulateBattle(
    attacker: Player,
    defender: Player,
    attackingFrom: Territory,
    defendingTerritory: Territory,
    allTerritories: Territory[],
    simulations: number = 1000
  ): Promise<{
    conquestProbability: number;
    avgAttackerLosses: number;
    avgDefenderLosses: number;
  }> {
    let conquests = 0;
    let totalAttackerLosses = 0;
    let totalDefenderLosses = 0;

    for (let i = 0; i < simulations; i++) {
      const result = await this.executeBattle(
        attacker,
        defender,
        attackingFrom,
        defendingTerritory,
        allTerritories
      );

      if (result.conquered) conquests++;
      totalAttackerLosses += result.attackerLosses;
      totalDefenderLosses += result.defenderLosses;
    }

    return {
      conquestProbability: conquests / simulations,
      avgAttackerLosses: totalAttackerLosses / simulations,
      avgDefenderLosses: totalDefenderLosses / simulations,
    };
  }

  /**
   * Get battle odds without running simulation
   * Fast estimation based on army counts
   *
   * @param attackerArmies Number of attacking armies
   * @param defenderArmies Number of defending armies
   * @returns Estimated conquest probability
   */
  static estimateBattleOdds(
    attackerArmies: number,
    defenderArmies: number
  ): number {
    // Simple heuristic: attacker needs roughly 2:1 ratio
    // This is a rough estimate; actual probability requires simulation
    const ratio = attackerArmies / defenderArmies;

    if (ratio < 1) return 0.1; // Very unlikely
    if (ratio < 1.5) return 0.3; // Low chance
    if (ratio < 2) return 0.5; // Even odds
    if (ratio < 3) return 0.7; // Good chance
    return 0.9; // Very likely
  }

  /**
   * Calculate optimal number of dice for attacker
   * Based on army count and strategy
   *
   * @param attackerArmies Attacking army count
   * @param aggressive If true, prefer more dice even with fewer armies
   * @returns Number of dice to roll (1-3)
   */
  static calculateOptimalAttackerDice(
    attackerArmies: number,
    aggressive: boolean = false
  ): number {
    // Must leave 1 army behind
    const availableArmies = attackerArmies - 1;

    if (availableArmies < 1) return 0;
    if (availableArmies === 1) return 1;
    if (availableArmies === 2) {
      // With 2 armies, aggressive players use 2 dice
      return aggressive ? 2 : 1;
    }

    // 3+ armies: always use 3 dice
    return 3;
  }

  /**
   * Calculate optimal number of dice for defender
   * Based on army count and strategy
   *
   * @param defenderArmies Defending army count
   * @param conservative If true, prefer fewer dice to preserve armies
   * @returns Number of dice to roll (1-2)
   */
  static calculateOptimalDefenderDice(
    defenderArmies: number,
    conservative: boolean = false
  ): number {
    if (defenderArmies < 1) return 0;
    if (defenderArmies === 1 || conservative) return 1;

    // 2+ armies: use 2 dice
    return 2;
  }
}

/**
 * Factory function to get BattleManager instance
 * (For consistency with other modules)
 */
export function getBattleManager(): typeof BattleManager {
  return BattleManager;
}
