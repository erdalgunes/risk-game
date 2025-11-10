/**
 * LandBattle
 *
 * Implements standard Risk land combat rules:
 * - Attacker rolls 1-3 dice (max 3, limited by army count - 1)
 * - Defender rolls 1-2 dice (max 2, limited by army count)
 * - Highest dice are compared
 * - Ties go to defender
 * - Battle continues until defender eliminated or attacker chooses to stop
 *
 * This implementation does ONE round of combat.
 * Multiple rounds are handled by the BattleManager.
 */

import { AbstractBattle, type BattleOutcome, type BattleContext } from './AbstractBattle';

/**
 * LandBattle - single round of Risk land combat
 */
export class LandBattle extends AbstractBattle {
  /**
   * Execute one round of land combat
   */
  protected async fight(): Promise<BattleOutcome> {
    const attackingArmies = this.context.attackingFrom.army_count;
    const defendingArmies = this.context.defendingTerritory.army_count;

    // Determine dice counts
    // Attacker: max 3, but must leave 1 army behind
    const attackerDiceCount = Math.min(3, attackingArmies - 1);

    // Defender: max 2, limited by army count
    const defenderDiceCount = Math.min(2, defendingArmies);

    if (attackerDiceCount < 1) {
      // Cannot attack with 0 dice
      return {
        success: false,
        attackerLosses: 0,
        defenderLosses: 0,
        conquered: false,
        attackerDice: [],
        defenderDice: [],
        rounds: 1,
      };
    }

    // Roll dice
    const attackerDice = this.rollDice(attackerDiceCount, this.context.attacker.id, 'attacker');

    const defenderDice = this.rollDice(defenderDiceCount, this.context.defender.id, 'defender');

    // Compare dice and calculate losses
    const { attackerLosses, defenderLosses } = this.compareDice(attackerDice, defenderDice);

    // Apply loss modifiers
    const modifiedLosses = this.applyLossModifiers(attackerLosses, defenderLosses);

    // Check if territory was conquered
    const remainingDefenders = defendingArmies - modifiedLosses.defenderLosses;
    const conquered = remainingDefenders === 0;

    return {
      success: true,
      attackerLosses: modifiedLosses.attackerLosses,
      defenderLosses: modifiedLosses.defenderLosses,
      conquered,
      attackerDice,
      defenderDice,
      rounds: 1,
    };
  }

  /**
   * Compare attacker and defender dice according to Risk rules
   *
   * Rules:
   * - Compare highest dice first
   * - If attacker's die is higher, defender loses 1 army
   * - If defender's die is higher or tied, attacker loses 1 army
   * - If both players have 2+ dice, compare second-highest too
   *
   * @param attackerDice Sorted descending
   * @param defenderDice Sorted descending
   * @returns Losses for each side
   */
  private compareDice(
    attackerDice: number[],
    defenderDice: number[]
  ): { attackerLosses: number; defenderLosses: number } {
    let attackerLosses = 0;
    let defenderLosses = 0;

    // Compare highest dice
    if (attackerDice[0] > defenderDice[0]) {
      defenderLosses++;
    } else {
      attackerLosses++;
    }

    // Compare second-highest dice (if both exist)
    if (attackerDice.length >= 2 && defenderDice.length >= 2) {
      if (attackerDice[1] > defenderDice[1]) {
        defenderLosses++;
      } else {
        attackerLosses++;
      }
    }

    return { attackerLosses, defenderLosses };
  }

  /**
   * Hook: Battle start
   * Can be used for logging/analytics in production
   */
  protected async onStart(): Promise<void> {
    // Battle starting - can add Sentry breadcrumb or analytics here if needed
  }

  /**
   * Hook: Battle end
   * Can be used for logging/analytics in production
   */
  protected async onEnd(): Promise<void> {
    // Battle ended - can add Sentry breadcrumb or analytics here if needed
  }
}

/**
 * Factory function to create a LandBattle
 *
 * @param context Battle context
 * @returns LandBattle instance
 */
export function createLandBattle(context: BattleContext): LandBattle {
  return new LandBattle(context);
}
