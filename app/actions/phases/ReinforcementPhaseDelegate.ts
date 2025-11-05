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

    // Execute placement atomically
    try {
      // Update territory armies
      const { error: territoryError } = await context.supabase
        .from('territories')
        .update({ army_count: territory.army_count + count })
        .eq('id', territoryId);

      if (territoryError) {
        return this.errorResult(`Failed to update territory: ${territoryError.message}`);
      }

      // Update player available armies
      const { error: playerError } = await context.supabase
        .from('players')
        .update({ armies_available: context.currentPlayer.armies_available - count })
        .eq('id', playerId);

      if (playerError) {
        return this.errorResult(`Failed to update player: ${playerError.message}`);
      }

      // Update local context
      territory.army_count += count;
      context.currentPlayer.armies_available -= count;

      // Check if we should auto-transition to attack phase
      if (context.currentPlayer.armies_available === 0 && context.game.status === 'playing') {
        return this.successResult({ placed: count }, 'attack');
      }

      // Check if we should transition from setup to playing
      if (context.game.status === 'setup') {
        // Check if all players have placed all their armies
        const { data: allPlayers } = await context.supabase
          .from('players')
          .select('armies_available')
          .eq('game_id', context.gameId);

        const allArmiesPlaced = allPlayers?.every((p) => p.armies_available === 0);

        if (allArmiesPlaced) {
          // Transition to playing phase
          await context.supabase
            .from('games')
            .update({
              status: 'playing',
              phase: 'reinforcement'
            })
            .eq('id', context.gameId);

          context.game.status = 'playing';
        }
      }

      return this.successResult({ placed: count });

    } catch (error: any) {
      return this.errorResult(`Placement failed: ${error.message}`);
    }
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
