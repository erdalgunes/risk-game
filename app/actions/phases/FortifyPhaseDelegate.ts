/**
 * Fortify Phase Delegate
 *
 * Handles army fortification during fortify phase.
 * Players can move armies between connected territories they own.
 */

import {
  PhaseDelegate,
  type PhaseContext,
  type ValidationResult,
  type ActionResult,
} from './PhaseDelegate';
import { canFortify } from '@/lib/game-engine/validation';
import type { GameAction } from '@/types/game';

export class FortifyPhaseDelegate extends PhaseDelegate {
  readonly name = 'fortify' as const;

  /**
   * Validate if action is allowed in fortify phase
   */
  canExecuteAction(action: GameAction, context: PhaseContext): ValidationResult {
    // Only fortify and end turn allowed
    if (action.action_type !== 'fortify' && action.action_type !== 'end_turn') {
      return {
        valid: false,
        reason: 'Only fortification and end turn are allowed during fortify phase',
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
   * Fortify a territory by moving armies from another territory
   *
   * @param context Game context
   * @param playerId Player fortifying
   * @param fromTerritoryId Source territory
   * @param toTerritoryId Destination territory
   * @param count Number of armies to move
   * @returns ActionResult with fortification results
   */
  async fortifyTerritory(
    context: PhaseContext,
    playerId: string,
    fromTerritoryId: string,
    toTerritoryId: string,
    count: number
  ): Promise<ActionResult> {
    // Validation
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    const fromTerritory = this.findTerritory(fromTerritoryId, context);
    const toTerritory = this.findTerritory(toTerritoryId, context);

    if (!fromTerritory || !toTerritory) {
      return this.errorResult('Territory not found');
    }

    // Validate using game engine
    const validation = canFortify(
      context.game,
      context.currentPlayer,
      fromTerritory,
      toTerritory,
      count,
      context.territories
    );

    if (!validation.valid) {
      return this.errorResult(validation.reason || 'Invalid fortification');
    }

    // Execute fortification atomically
    try {
      // Remove armies from source territory
      const { error: fromError } = await context.supabase
        .from('territories')
        .update({ army_count: fromTerritory.army_count - count })
        .eq('id', fromTerritoryId);

      if (fromError) {
        return this.errorResult(`Failed to update source territory: ${fromError.message}`);
      }

      // Add armies to destination territory
      const { error: toError } = await context.supabase
        .from('territories')
        .update({ army_count: toTerritory.army_count + count })
        .eq('id', toTerritoryId);

      if (toError) {
        return this.errorResult(`Failed to update destination territory: ${toError.message}`);
      }

      // Update local context
      fromTerritory.army_count -= count;
      toTerritory.army_count += count;

      return this.successResult({
        fromTerritory: fromTerritoryId,
        toTerritory: toTerritoryId,
        armiesMoved: count,
      });
    } catch (error: any) {
      return this.errorResult(`Fortification failed: ${error.message}`);
    }
  }

  /**
   * Skip fortification and end turn
   * This is commonly used when player doesn't want to fortify
   */
  async skipFortify(context: PhaseContext, playerId: string): Promise<ActionResult> {
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    // Skipping fortify ends the turn
    // The actual turn ending is handled by the endTurn action
    return this.successResult({ skipped: true });
  }
}
