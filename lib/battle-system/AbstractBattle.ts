/**
 * Abstract Battle System
 *
 * Provides object-oriented battle representation with lifecycle hooks.
 * Inspired by TripleA's battle system but adapted for Risk rules.
 *
 * Key concepts:
 * - Battles as objects (not just function calls)
 * - Lifecycle hooks (onStart, beforeRoll, afterRoll, onEnd)
 * - Modifier chains (terrain, fortifications, cards, etc.)
 * - Extensibility for future variants (sea battles, air battles)
 */

import type { Territory, Player } from '@/types/game';

/**
 * Battle outcome
 */
export interface BattleOutcome {
  success: boolean;
  attackerLosses: number;
  defenderLosses: number;
  conquered: boolean;
  attackerDice: number[];
  defenderDice: number[];
  rounds: number;
}

/**
 * Battle context - immutable state passed to modifiers
 */
export interface BattleContext {
  attacker: Player;
  defender: Player;
  attackingFrom: Territory;
  defendingTerritory: Territory;
  allTerritories: Territory[];
}

/**
 * Dice roll result before modification
 */
export interface DiceRoll {
  dice: number[];
  rollerId: string; // player_id of who rolled
}

/**
 * Battle modifier interface
 * Modifiers can affect dice rolls, army counts, or battle outcomes
 */
export interface BattleModifier {
  readonly name: string;
  readonly description: string;
  readonly priority: number; // Lower = applied first

  /**
   * Called before dice are rolled
   * Can modify army counts participating in battle
   */
  beforeRoll?(
    context: BattleContext,
    attackerArmies: number,
    defenderArmies: number
  ): { attackerArmies: number; defenderArmies: number };

  /**
   * Called after dice are rolled but before comparison
   * Can modify dice values
   */
  modifyDice?(context: BattleContext, roll: DiceRoll): number[];

  /**
   * Called after losses are calculated
   * Can modify loss counts
   */
  modifyLosses?(
    context: BattleContext,
    attackerLosses: number,
    defenderLosses: number
  ): { attackerLosses: number; defenderLosses: number };

  /**
   * Check if this modifier applies to the battle
   */
  appliesTo(context: BattleContext): boolean;
}

/**
 * Abstract base class for all battle types
 * Implements template method pattern for battle flow
 */
export abstract class AbstractBattle {
  protected context: BattleContext;
  protected modifiers: BattleModifier[] = [];
  protected outcome: BattleOutcome | null = null;

  constructor(context: BattleContext) {
    this.context = context;
  }

  /**
   * Add a modifier to the battle
   * Modifiers are automatically sorted by priority
   */
  addModifier(modifier: BattleModifier): void {
    if (modifier.appliesTo(this.context)) {
      this.modifiers.push(modifier);
      this.modifiers.sort((a, b) => a.priority - b.priority);
    }
  }

  /**
   * Execute the battle - template method
   * Defines the battle flow that subclasses follow
   */
  async execute(): Promise<BattleOutcome> {
    // Hook: Battle start
    await this.onStart();

    // Main battle logic
    this.outcome = await this.fight();

    // Hook: Battle end
    await this.onEnd();

    return this.outcome;
  }

  /**
   * Hook: Called before battle starts
   * Subclasses can override for setup logic
   */
  protected async onStart(): Promise<void> {
    // Default: no-op
  }

  /**
   * Hook: Called after battle ends
   * Subclasses can override for cleanup logic
   */
  protected async onEnd(): Promise<void> {
    // Default: no-op
  }

  /**
   * Main battle logic - must be implemented by subclasses
   * This is where the actual combat resolution happens
   */
  protected abstract fight(): Promise<BattleOutcome>;

  /**
   * Roll dice for attacker or defender
   * Applies modifiers to dice rolls
   */
  protected rollDice(
    count: number,
    rollerId: string,
    rollerType: 'attacker' | 'defender'
  ): number[] {
    // Roll base dice
    const baseDice = this.generateDice(count);

    // Apply modifiers
    let modifiedDice = baseDice;
    for (const modifier of this.modifiers) {
      if (modifier.modifyDice) {
        modifiedDice = modifier.modifyDice(this.context, {
          dice: modifiedDice,
          rollerId,
        });
      }
    }

    return modifiedDice;
  }

  /**
   * Generate random dice rolls
   * Uses cryptographically secure random
   */
  protected generateDice(count: number): number[] {
    const dice: number[] = [];
    for (let i = 0; i < count; i++) {
      dice.push(this.rollOneDie());
    }
    return dice.sort((a, b) => b - a); // Sort descending
  }

  /**
   * Roll a single die (1-6)
   * Uses crypto.getRandomValues with rejection sampling
   */
  protected rollOneDie(): number {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);

    // Rejection sampling to avoid modulo bias
    const max = Math.floor(0xffffffff / 6) * 6;
    let value = array[0];

    while (value >= max) {
      globalThis.crypto.getRandomValues(array);
      value = array[0];
    }

    return (value % 6) + 1;
  }

  /**
   * Apply loss modifiers
   */
  protected applyLossModifiers(
    attackerLosses: number,
    defenderLosses: number
  ): { attackerLosses: number; defenderLosses: number } {
    let losses = { attackerLosses, defenderLosses };

    for (const modifier of this.modifiers) {
      if (modifier.modifyLosses) {
        losses = modifier.modifyLosses(this.context, losses.attackerLosses, losses.defenderLosses);
      }
    }

    return losses;
  }

  /**
   * Get battle context
   */
  getContext(): BattleContext {
    return this.context;
  }

  /**
   * Get battle outcome (null if not executed yet)
   */
  getOutcome(): BattleOutcome | null {
    return this.outcome;
  }
}
