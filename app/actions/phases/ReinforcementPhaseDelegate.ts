/**
 * Reinforcement Phase Delegate
 *
 * Handles army placement during setup and reinforcement phases.
 * Manages auto-transition to attack phase when all players have placed armies.
 */

import {
  PhaseDelegate,
  type PhaseContext,
  type ValidationResult,
  type ActionResult,
} from './PhaseDelegate';
import type { GameAction } from '@/types/game';

export class ReinforcementPhaseDelegate extends PhaseDelegate {
  readonly name = 'reinforcement' as const;

  /**
   * Validate if action is allowed in reinforcement phase
   */
  canExecuteAction(action: GameAction, context: PhaseContext): ValidationResult {
    // Only army placement allowed in reinforcement phase
    if (action.action_type !== 'place_army') {
      return {
        valid: false,
        reason: 'Only army placement is allowed during reinforcement phase',
      };
    }

    // Must be current player
    if (action.player_id !== context.currentPlayer.id) {
      return {
        valid: false,
        reason: 'Not your turn',
      };
    }

    return { valid: true };
  }

  /**
   * Place armies on a territory
   *
   * @param context Game context
   * @param playerId Player placing armies
   * @param territoryId Territory to place on
   * @param count Number of armies to place
   * @returns ActionResult with optional transition to attack phase
   */
  async placeArmies(
    context: PhaseContext,
    playerId: string,
    territoryId: string,
    count: number
  ): Promise<ActionResult> {
    // Validation: Current player
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    // Validation: Player active
    const activeValidation = this.validatePlayerActive(playerId, context);
    if (!activeValidation.valid) {
      return this.errorResult(activeValidation.reason || 'Player not active');
    }

    // Validation: Has armies available
    if (context.currentPlayer.armies_available < count) {
      return this.errorResult(
        `Not enough armies available (have: ${context.currentPlayer.armies_available}, need: ${count})`
      );
    }

    if (count < 1) {
      return this.errorResult('Must place at least 1 army');
    }

    // Find territory
    const territory = this.findTerritory(territoryId, context);
    if (!territory) {
      return this.errorResult('Territory not found');
    }

    // Validation: Must own territory (or unclaimed during setup)
    const isSetup = context.game.status === 'setup';
    if (!isSetup && territory.owner_id !== playerId) {
      return this.errorResult('You do not own this territory');
    }

    // During setup, can only place on territories you own
    if (isSetup && territory.owner_id !== playerId) {
      return this.errorResult('You do not own this territory');
    }

    try {
      // Update territory and player in parallel
      const [territoryResult, playerResult] = await Promise.all([
        context.supabase
          .from('territories')
          .update({ army_count: territory.army_count + count })
          .eq('id', territory.id),
        context.supabase
          .from('players')
          .update({ armies_available: context.currentPlayer.armies_available - count })
          .eq('id', playerId),
      ]);

      if (territoryResult.error) throw territoryResult.error;
      if (playerResult.error) throw playerResult.error;

      // Check if all players have placed all armies
      // If so, auto-transition to attack phase (during setup) or stay in reinforcement (during playing)
      const allPlayersPlaced = await this.checkAllPlayersPlaced(context, count);

      if (allPlayersPlaced && isSetup) {
        // Transition game from setup → playing with attack phase
        await context.supabase
          .from('games')
          .update({ status: 'playing', phase: 'attack' })
          .eq('id', context.gameId);

        return this.successResult(
          { armiesPlaced: count, gameStarted: true },
          'attack'
        );
      }

      // Check if current player has no armies left, auto-transition to attack
      const newArmiesAvailable = context.currentPlayer.armies_available - count;
      if (newArmiesAvailable === 0 && !isSetup) {
        return this.successResult(
          { armiesPlaced: count },
          'attack'
        );
      }

      return this.successResult({ armiesPlaced: count });
    } catch (error) {
      console.error('Error placing armies:', error);
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Skip to attack phase (if player has placed all armies)
   */
  async skipToAttack(context: PhaseContext, playerId: string): Promise<ActionResult> {
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    if (context.currentPlayer.armies_available > 0) {
      return this.errorResult('Must place all available armies before continuing');
    }

    return this.successResult(null, 'attack');
  }

  /**
   * Check if all players have placed all available armies
   *
   * @param context Game context
   * @param justPlaced Number of armies just placed (to account for in calculation)
   * @returns true if all players have 0 armies_available
   */
  private async checkAllPlayersPlaced(
    context: PhaseContext,
    justPlaced: number
  ): Promise<boolean> {
    // Fetch fresh player data
    const { data: players, error } = await context.supabase
      .from('players')
      .select('armies_available')
      .eq('game_id', context.gameId);

    if (error || !players) {
      return false;
    }

    // Account for the armies we just placed (not yet reflected in DB)
    const currentPlayerArmiesLeft = context.currentPlayer.armies_available - justPlaced;

    // Check if all players (including current player with updated value) have 0 armies
    const allPlaced = players.every((p) => {
      if (p.armies_available === context.currentPlayer.armies_available) {
        // This is the current player's record (before update)
        return currentPlayerArmiesLeft === 0;
      }
      return p.armies_available === 0;
    });

    return allPlaced;
  }
}
