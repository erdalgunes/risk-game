/**
 * Phase Delegate Base Class
 *
 * Abstract class for phase-specific game logic.
 * Each game phase (reinforcement, attack, fortify) has its own delegate.
 *
 * Provides:
 * - Phase lifecycle hooks (onEnter, onExit)
 * - Action validation
 * - Common helper methods for all phases
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game, Player, Territory, GameAction, GamePhase } from '@/types/game';

/**
 * Context passed to phase delegates
 * Contains all game state needed for validation and execution
 */
export interface PhaseContext {
  gameId: string;
  supabase: SupabaseClient;
  game: Game;
  currentPlayer: Player;
  players: Player[];
  territories: Territory[];
}

/**
 * Result of action validation
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Result of action execution
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  result?: any;
  transitionTo?: GamePhase;
}

/**
 * Abstract Phase Delegate
 *
 * Each phase implements this interface with phase-specific logic.
 * Provides common helper methods shared across all phases.
 */
export abstract class PhaseDelegate {
  /**
   * Phase name (reinforcement, attack, or fortify)
   */
  abstract readonly name: GamePhase;

  /**
   * Validate if an action can be executed in this phase
   *
   * @param action Action to validate
   * @param context Game context
   * @returns ValidationResult indicating if action is allowed
   */
  abstract canExecuteAction(
    action: GameAction,
    context: PhaseContext
  ): ValidationResult;

  /**
   * Called when phase is entered
   * Override to perform phase-specific initialization
   *
   * @param context Game context
   */
  async onEnter(context: PhaseContext): Promise<void> {
    // Default: no-op
    // Subclasses can override to perform setup
  }

  /**
   * Called when phase is exited
   * Override to perform phase-specific cleanup
   *
   * @param context Game context
   */
  async onExit(context: PhaseContext): Promise<void> {
    // Default: no-op
    // Subclasses can override to perform cleanup
  }

  // ============================================
  // Helper Methods (Protected)
  // ============================================

  /**
   * Check if playerId matches current player
   */
  protected isCurrentPlayer(playerId: string, context: PhaseContext): boolean {
    return playerId === context.currentPlayer.id;
  }

  /**
   * Find a territory by ID
   */
  protected findTerritory(
    territoryId: string,
    context: PhaseContext
  ): Territory | undefined {
    return context.territories.find((t) => t.id === territoryId);
  }

  /**
   * Find a player by ID
   */
  protected findPlayer(
    playerId: string,
    context: PhaseContext
  ): Player | undefined {
    return context.players.find((p) => p.id === playerId);
  }

  /**
   * Create a success result
   */
  protected successResult(
    result?: any,
    transitionTo?: GamePhase
  ): ActionResult {
    return {
      success: true,
      result,
      transitionTo,
    };
  }

  /**
   * Create an error result
   */
  protected errorResult(error: string): ActionResult {
    return {
      success: false,
      error,
    };
  }

  /**
   * Validate that player owns a territory
   */
  protected validateOwnership(
    territory: Territory,
    playerId: string
  ): ValidationResult {
    if (territory.owner_id !== playerId) {
      return {
        valid: false,
        reason: 'You do not own this territory',
      };
    }
    return { valid: true };
  }

  /**
   * Validate that territory has enough armies
   */
  protected validateArmyCount(
    territory: Territory,
    minArmies: number
  ): ValidationResult {
    if (territory.army_count < minArmies) {
      return {
        valid: false,
        reason: `Territory must have at least ${minArmies} armies`,
      };
    }
    return { valid: true };
  }
}
