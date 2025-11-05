/**
 * Attack Phase Delegate
 *
 * Handles combat between territories during attack phase.
 * Validates attacks, executes combat, handles territory conquest and player elimination.
 */

import {
  PhaseDelegate,
  type PhaseContext,
  type ValidationResult,
  type ActionResult
} from './PhaseDelegate';
import { canAttack } from '@/lib/game-engine/validation';
import { BattleManager } from '@/lib/battle-system/BattleManager';
import type { GameAction, AttackResult, Player } from '@/types/game';

export class AttackPhaseDelegate extends PhaseDelegate {
  readonly name = 'attack' as const;

  /**
   * Validate if action is allowed in attack phase
   */
  canExecuteAction(action: GameAction, context: PhaseContext): ValidationResult {
    // Only attacks allowed in attack phase
    if (action.action_type !== 'attack') {
      return {
        valid: false,
        reason: 'Only attacks are allowed during attack phase'
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
   * Attack a territory
   *
   * @param context Game context
   * @param playerId Attacking player
   * @param fromTerritoryId Attacking from
   * @param toTerritoryId Attacking to
   * @returns ActionResult with battle results
   */
  async attackTerritory(
    context: PhaseContext,
    playerId: string,
    fromTerritoryId: string,
    toTerritoryId: string
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

    // Validate attack using game engine
    const validation = canAttack(
      context.game,
      context.currentPlayer,
      fromTerritory,
      toTerritory
    );

    if (!validation.valid) {
      return this.errorResult(validation.reason || 'Invalid attack');
    }

    // Find defender player
    const defender = context.players.find((p: Player) => p.id === toTerritory.owner_id);
    if (!defender) {
      return this.errorResult('Defender not found');
    }

    // Resolve combat using BattleManager
    const result: AttackResult = await BattleManager.executeBattle(
      context.currentPlayer,
      defender,
      fromTerritory,
      toTerritory,
      context.territories
    );

    // Calculate armies to move if conquered
    const armiesToMove = result.conquered
      ? fromTerritory.army_count - result.attackerLosses - 1
      : 0;

    // Execute attack atomically via stored procedure
    const { error: txError } = await context.supabase.rpc(
      'attack_territory_transaction',
      {
        p_game_id: context.gameId,
        p_player_id: playerId,
        p_from_territory_id: fromTerritoryId,
        p_to_territory_id: toTerritoryId,
        p_attacker_losses: result.attackerLosses,
        p_defender_losses: result.defenderLosses,
        p_conquered: result.conquered,
        p_armies_to_move: armiesToMove,
      }
    );

    if (txError) {
      return this.errorResult(`Transaction failed: ${txError.message}`);
    }

    // Check if game is finished (winner detected by stored procedure)
    const { data: updatedGame } = await context.supabase
      .from('games')
      .select('status, winner_id')
      .eq('id', context.gameId)
      .single();

    if (updatedGame?.status === 'finished') {
      return this.successResult({
        ...result,
        gameFinished: true,
        winner: updatedGame.winner_id
      });
    }

    return this.successResult(result);
  }

  /**
   * Skip to fortify phase
   */
  async skipToFortify(context: PhaseContext, playerId: string): Promise<ActionResult> {
    if (!this.isCurrentPlayer(playerId, context)) {
      return this.errorResult('Not your turn');
    }

    return this.successResult(null, 'fortify');
  }
}
