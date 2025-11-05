/**
 * Combat Modifiers
 *
 * Implements chain of responsibility pattern for battle modifiers.
 * These are example modifiers showing how to extend the battle system.
 *
 * Future variants could add:
 * - Terrain modifiers (mountains, forests)
 * - Fortification bonuses
 * - Card bonuses
 * - Technology upgrades
 * - Special unit types
 */

import type { BattleModifier, BattleContext, DiceRoll } from '../AbstractBattle';

/**
 * Example: Fortification Modifier
 *
 * Defender gets +1 to their highest die if territory has fortifications
 * (For future implementation when fortifications are added)
 */
export class FortificationModifier implements BattleModifier {
  readonly name = 'Fortification Bonus';
  readonly description = 'Defender gets +1 to highest die';
  readonly priority = 10;

  appliesTo(context: BattleContext): boolean {
    // Check if defending territory has fortifications
    // For now, always false (fortifications not implemented)
    return false;
  }

  modifyDice(context: BattleContext, roll: DiceRoll): number[] {
    // Only apply to defender
    if (roll.rollerId !== context.defender.id) {
      return roll.dice;
    }

    // Add +1 to highest die (max 6)
    const modified = [...roll.dice];
    modified[0] = Math.min(6, modified[0] + 1);

    return modified.sort((a, b) => b - a);
  }
}

/**
 * Example: Mountain Defense Modifier
 *
 * Defender in mountains reduces attacker losses by 1 (minimum 0)
 * (For future implementation when terrain types are added)
 */
export class MountainDefenseModifier implements BattleModifier {
  readonly name = 'Mountain Defense';
  readonly description = 'Defenders in mountains are harder to dislodge';
  readonly priority = 20;

  appliesTo(context: BattleContext): boolean {
    // Check if defending territory is mountainous
    // For now, always false (terrain types not implemented)
    return false;
  }

  modifyLosses(
    context: BattleContext,
    attackerLosses: number,
    defenderLosses: number
  ): { attackerLosses: number; defenderLosses: number } {
    // Reduce defender losses by 1 (minimum 0)
    return {
      attackerLosses,
      defenderLosses: Math.max(0, defenderLosses - 1),
    };
  }
}

/**
 * Example: Blitz Attack Modifier
 *
 * If attacker has 3x more armies, they get +1 to lowest die
 * (Example of conditional modifier based on army count)
 */
export class BlitzAttackModifier implements BattleModifier {
  readonly name = 'Blitz Attack';
  readonly description = 'Overwhelming force gives +1 to lowest die';
  readonly priority = 5;

  appliesTo(context: BattleContext): boolean {
    const attackerArmies = context.attackingFrom.army_count;
    const defenderArmies = context.defendingTerritory.army_count;

    // Apply if attacker has 3x or more armies
    return attackerArmies >= defenderArmies * 3;
  }

  modifyDice(context: BattleContext, roll: DiceRoll): number[] {
    // Only apply to attacker
    if (roll.rollerId !== context.attacker.id) {
      return roll.dice;
    }

    // Add +1 to lowest die (max 6)
    const modified = [...roll.dice];
    if (modified.length > 0) {
      const lowestIndex = modified.length - 1;
      modified[lowestIndex] = Math.min(6, modified[lowestIndex] + 1);
    }

    return modified.sort((a, b) => b - a);
  }
}

/**
 * Example: Defensive Fortifications Modifier
 *
 * Defender takes -1 loss (minimum 1) if they have fortifications
 * (Shows how to modify loss calculation)
 */
export class DefensiveFortificationsModifier implements BattleModifier {
  readonly name = 'Defensive Fortifications';
  readonly description = 'Fortifications reduce defender losses';
  readonly priority = 15;

  appliesTo(context: BattleContext): boolean {
    // Check if defending territory has fortifications
    // For now, always false
    return false;
  }

  modifyLosses(
    context: BattleContext,
    attackerLosses: number,
    defenderLosses: number
  ): { attackerLosses: number; defenderLosses: number } {
    // Reduce defender losses by 1, but must lose at least 1 army if hit
    return {
      attackerLosses,
      defenderLosses: defenderLosses > 0 ? Math.max(1, defenderLosses - 1) : 0,
    };
  }
}

/**
 * Modifier Registry
 *
 * Central place to register and retrieve modifiers
 * Add new modifiers here to make them available to battles
 */
export class ModifierRegistry {
  private static modifiers: Map<string, BattleModifier> = new Map();

  /**
   * Register a modifier
   */
  static register(modifier: BattleModifier): void {
    this.modifiers.set(modifier.name, modifier);
  }

  /**
   * Get all registered modifiers
   */
  static getAll(): BattleModifier[] {
    return Array.from(this.modifiers.values());
  }

  /**
   * Get modifier by name
   */
  static get(name: string): BattleModifier | undefined {
    return this.modifiers.get(name);
  }

  /**
   * Clear all modifiers (for testing)
   */
  static clear(): void {
    this.modifiers.clear();
  }
}

// Register default modifiers
ModifierRegistry.register(new FortificationModifier());
ModifierRegistry.register(new MountainDefenseModifier());
ModifierRegistry.register(new BlitzAttackModifier());
ModifierRegistry.register(new DefensiveFortificationsModifier());

/**
 * Helper function to get applicable modifiers for a battle
 */
export function getApplicableModifiers(context: BattleContext): BattleModifier[] {
  return ModifierRegistry.getAll().filter((mod) => mod.appliesTo(context));
}
