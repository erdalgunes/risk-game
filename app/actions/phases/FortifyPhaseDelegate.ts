/**
 * Fortify Phase Delegate
 *
 * Handles army movement between connected territories during fortify phase.
 * Uses BFS validation to ensure territories are connected through player's network.
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
    // Only fortify allowed in fortify phase
    if (action.action_type !== 'fortify') {
      return {
        valid: false,
        reason: 'Only fortify is allowed during fortify phase',
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
   * Fortify territory by moving armies from one to another
   *
   * @param context Game context
   * @param playerId Player performing fortify
   * @param fromTerritoryId Source territory
   * @param toTerritoryId Destination territory
   * @param armyCount Number of armies to move
   * @returns ActionResult
   */
  async fortifyTerritory(
    context: PhaseContext,
    playerId: string,
    fromTerritoryId: string,
    toTerritoryId: string,
    armyCount: number
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

    // Validation: Phase
    const phaseValidation = this.validatePhase('fortify', context);
    if (!phaseValidation.valid) {
      return this.errorResult(phaseValidation.reason || 'Wrong phase');
    }

    // Find territories
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
      armyCount,
      context.territories
    );

    if (!validation.valid) {
      return this.errorResult(validation.reason || 'Invalid fortify');
    }

    // Additional validation: Army count
    if (armyCount < 1) {
      return this.errorResult('Must move at least 1 army');
    }

    try {
      // Update both territories atomically
      const [fromResult, toResult] = await Promise.all([
        context.supabase
          .from('territories')
          .update({ army_count: fromTerritory.army_count - armyCount })
          .eq('id', fromTerritory.id),
        context.supabase
          .from('territories')
          .update({ army_count: toTerritory.army_count + armyCount })
          .eq('id', toTerritory.id),
      ]);

      if (fromResult.error) throw fromResult.error;
      if (toResult.error) throw toResult.error;

      return this.successResult({
        fromTerritory: fromTerritory.territory_name,
        toTerritory: toTerritory.territory_name,
        armiesMoved: armyCount,
      });
    } catch (error) {
      console.error('Error fortifying territory:', error);
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Skip fortify phase (end turn without fortifying)
   *
   * @param context Game context
   * @param playerId Player skipping
   * @returns ActionResult
   */
  async skipFortify(context: PhaseContext, playerId: string): Promise<ActionResult> {
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    // Fortify phase ends with endTurn action, not a phase transition
    // This method just confirms the player is done with their turn
    return this.successResult({ skipped: true });
  }
}
