/**
 * Reinforcement Phase Delegate
 *
 * Handles army placement during reinforcement phase.
 * Players receive armies based on territories owned and place them strategically.
 */

import {
  PhaseDelegate,
  type PhaseContext,
  type ValidationResult,
  type ActionResult
} from './PhaseDelegate';
import { canPlaceArmies } from '@/lib/game-engine/validation';
import type { GameAction } from '@/types/game';

export class ReinforcementPhaseDelegate extends PhaseDelegate {
  readonly name = 'reinforcement' as const;

  /**
   * Validate if action is allowed in reinforcement phase
   */
  canExecuteAction(action: GameAction, context: PhaseContext): ValidationResult {
    // Only army placement and phase changes allowed
    if (action.action_type !== 'place_army' && action.action_type !== 'change_phase') {
      return {
        valid: false,
        reason: 'Only army placement and phase changes are allowed during reinforcement phase'
      };
    }

    // Must be current player
    if (action.player_id !== context.currentPlayer.id) {
      return {
        valid: false,
        reason: 'Not your turn'
      };
    }

    return { valid: true };
  }

  /**
   * Place armies on a territory
   *
   * @param context Game context
   * @param playerId Player placing armies
   * @param territoryId Territory to place armies on
   * @param count Number of armies to place
   * @returns ActionResult with placement results
   */
  async placeArmies(
    context: PhaseContext,
    playerId: string,
    territoryId: string,
    count: number
  ): Promise<ActionResult> {
    // Validation
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    const territory = this.findTerritory(territoryId, context);
    if (!territory) {
      return this.errorResult('Territory not found');
    }

    // Validate using game engine
    const validation = canPlaceArmies(
      context.game,
      context.currentPlayer,
      territory,
      count
    );

    if (!validation.valid) {
      return this.errorResult(validation.reason || 'Invalid army placement');
    }

    // Execute placement atomically using RPC transaction
    const { data: result, error: txError } = await context.supabase.rpc(
      'place_armies_transaction',
      {
        p_game_id: context.gameId,
        p_player_id: playerId,
        p_territory_id: territoryId,
        p_count: count,
      }
    );

    const txResult = this.handleTransactionResult(result, txError);
    if (txResult) return txResult;

    // Update local context
    territory.army_count = result.territory_armies;
    context.currentPlayer.armies_available = result.player_armies_remaining;

    // Check if we should auto-transition to attack phase
    if (result.player_armies_remaining === 0 && result.game_status === 'playing') {
      return this.successResult({ placed: count }, 'attack');
    }

    // Check if we should transition from setup to playing
    if (result.game_status === 'setup') {
      // Use atomic RPC to check and transition
      const { data: transitionResult, error: transitionError } = await context.supabase.rpc(
        'check_and_transition_from_setup',
        { p_game_id: context.gameId }
      );

      if (transitionError || !transitionResult || !transitionResult.success) {
        // Log error but don't fail the placement
        console.error('Setup transition check failed:', transitionError || transitionResult?.error);
      } else if (transitionResult.transitioned) {
        // Update local context
        context.game.status = 'playing';
      }
    }

    return this.successResult({ placed: count });
  }

  /**
   * Skip to attack phase
   */
  async skipToAttack(context: PhaseContext, playerId: string): Promise<ActionResult> {
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    return this.successResult(null, 'attack');
  }
}
