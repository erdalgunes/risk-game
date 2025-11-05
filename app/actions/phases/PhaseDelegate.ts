/**
 * Phase Delegate Base Class
 *
 * Abstract base class implementing the State pattern for game phases.
 * Each phase (reinforcement, attack, fortify) extends this class to provide
 * phase-specific validation and action execution logic.
 *
 * Design Patterns:
 * - State Pattern: Each phase is a separate state with its own behavior
 * - Template Method: Base class provides common functionality, subclasses implement specifics
 * - Dependency Injection: Context object provides all dependencies
 *
 * Best Practices (2024):
 * - Type-safe interfaces using discriminated unions
 * - Protected helper methods for DRY principle
 * - Abstract methods force subclass implementation
 * - Immutable context object (read-only where possible)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game, Player, Territory, GameAction, GamePhase } from '@/types/game';

/**
 * Phase Context - Game state container
 *
 * Passed to all phase delegate methods. Contains all data needed
 * to validate and execute actions without additional database queries.
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
 * Validation Result
 *
 * Returned by validation methods to indicate success or failure
 * with optional reason for failure.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Action Result
 *
 * Returned by all action methods. Provides consistent structure
 * for success/failure responses and optional phase transitions.
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  result?: any;
  transitionTo?: GamePhase;
}

/**
 * Phase Delegate Abstract Base Class
 *
 * Subclasses must implement:
 * - name: Unique phase identifier
 * - canExecuteAction: Validate if action is allowed in this phase
 *
 * Subclasses can optionally implement:
 * - Phase-specific action methods (e.g., attackTerritory, placeArmies)
 */
export abstract class PhaseDelegate {
  /**
   * Phase name - Must be unique for each phase
   */
  abstract readonly name: GamePhase;

  /**
   * Validate if action can be executed in this phase
   *
   * @param action The action to validate
   * @param context Current game context
   * @returns Validation result with optional reason for failure
   */
  abstract canExecuteAction(
    action: GameAction,
    context: PhaseContext
  ): ValidationResult;

  // ============================================================
  // Protected Helper Methods
  // ============================================================

  /**
   * Check if player is current player
   *
   * @param playerId Player to check
   * @param context Game context
   * @returns true if player is current player
   */
  protected isCurrentPlayer(playerId: string, context: PhaseContext): boolean {
    return context.currentPlayer.id === playerId;
  }

  /**
   * Find territory by ID in context
   *
   * @param territoryId Territory ID (UUID or territory_name)
   * @param context Game context
   * @returns Territory if found, undefined otherwise
   */
  protected findTerritory(
    territoryId: string,
    context: PhaseContext
  ): Territory | undefined {
    return context.territories.find(
      (t) => t.id === territoryId || t.territory_name === territoryId
    );
  }

  /**
   * Find player by ID in context
   *
   * @param playerId Player ID
   * @param context Game context
   * @returns Player if found, undefined otherwise
   */
  protected findPlayer(
    playerId: string,
    context: PhaseContext
  ): Player | undefined {
    return context.players.find((p) => p.id === playerId);
  }

  /**
   * Check if player owns territory
   *
   * @param territory Territory to check
   * @param playerId Player ID
   * @returns true if player owns territory
   */
  protected ownsTerritory(territory: Territory, playerId: string): boolean {
    return territory.owner_id === playerId;
  }

  /**
   * Get territories owned by player
   *
   * @param playerId Player ID
   * @param context Game context
   * @returns Array of territories owned by player
   */
  protected getPlayerTerritories(
    playerId: string,
    context: PhaseContext
  ): Territory[] {
    return context.territories.filter((t) => t.owner_id === playerId);
  }

  /**
   * Create error result
   *
   * @param message Error message
   * @returns ActionResult with error
   */
  protected errorResult(message: string): ActionResult {
    return {
      success: false,
      error: message,
    };
  }

  /**
   * Create success result
   *
   * @param result Optional result data
   * @param transitionTo Optional phase to transition to
   * @returns ActionResult with success
   */
  protected successResult(
    result?: any,
    transitionTo?: GamePhase
  ): ActionResult {
    return {
      success: true,
      result,
      ...(transitionTo && { transitionTo }),
    };
  }

  /**
   * Validate player is not eliminated
   *
   * @param playerId Player ID
   * @param context Game context
   * @returns Validation result
   */
  protected validatePlayerActive(
    playerId: string,
    context: PhaseContext
  ): ValidationResult {
    const player = this.findPlayer(playerId, context);

    if (!player) {
      return { valid: false, reason: 'Player not found' };
    }

    if (player.is_eliminated) {
      return { valid: false, reason: 'Player has been eliminated' };
    }

    return { valid: true };
  }

  /**
   * Validate game is in playing status
   *
   * @param context Game context
   * @returns Validation result
   */
  protected validateGamePlaying(context: PhaseContext): ValidationResult {
    if (context.game.status !== 'playing') {
      return {
        valid: false,
        reason: `Game is not in playing status (current: ${context.game.status})`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate current phase matches expected phase
   *
   * @param expectedPhase Expected phase
   * @param context Game context
   * @returns Validation result
   */
  protected validatePhase(
    expectedPhase: GamePhase,
    context: PhaseContext
  ): ValidationResult {
    if (context.game.phase !== expectedPhase) {
      return {
        valid: false,
        reason: `Wrong phase (expected: ${expectedPhase}, current: ${context.game.phase})`,
      };
    }

    return { valid: true };
  }
}
