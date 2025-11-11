/**
 * Basic AI opponent that makes random valid moves
 * This is intentionally simple for the proof of concept
 */

import type { GameState, AIMove, TerritoryId } from './types';
import { validateAttack, validateFortify } from './validation';

/**
 * Decide the AI's next move
 * Strategy: Make random valid moves
 */
export function decideAIMove(gameState: GameState): AIMove {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const ownedTerritories = gameState.territories.filter((t) => t.ownerId === currentPlayer.id);

  if (gameState.phase === 'attack') {
    // Try to find valid attacks
    const possibleAttacks: Array<{ from: TerritoryId; to: TerritoryId }> = [];

    for (const fromTerritory of ownedTerritories) {
      if (fromTerritory.troops < 2) continue;

      for (const adjacentId of fromTerritory.adjacentTerritories) {
        const validation = validateAttack(gameState, fromTerritory.id, adjacentId);
        if (validation.valid) {
          possibleAttacks.push({
            from: fromTerritory.id,
            to: adjacentId,
          });
        }
      }
    }

    // Randomly decide whether to attack or skip to fortify
    // 70% chance to attack if possible, 30% skip to fortify
    // NOSONAR: Math.random() is safe for game AI decisions, not cryptographic use
    if (possibleAttacks.length > 0 && Math.random() < 0.7) {
      const attack = possibleAttacks[Math.floor(Math.random() * possibleAttacks.length)]; // NOSONAR
      return {
        type: 'attack',
        fromTerritoryId: attack.from,
        toTerritoryId: attack.to,
      };
    }

    // Skip to fortify phase
    return { type: 'end-turn' }; // Will trigger phase change
  }

  if (gameState.phase === 'fortify') {
    // Try to find valid fortify moves
    const possibleFortifies: Array<{ from: TerritoryId; to: TerritoryId; troops: number }> = [];

    for (const fromTerritory of ownedTerritories) {
      if (fromTerritory.troops < 2) continue;

      for (const toTerritory of ownedTerritories) {
        if (fromTerritory.id === toTerritory.id) continue;

        const troopsToMove = Math.floor(fromTerritory.troops / 2);
        if (troopsToMove < 1) continue;

        const validation = validateFortify(
          gameState,
          fromTerritory.id,
          toTerritory.id,
          troopsToMove
        );

        if (validation.valid) {
          possibleFortifies.push({
            from: fromTerritory.id,
            to: toTerritory.id,
            troops: troopsToMove,
          });
        }
      }
    }

    // Randomly decide whether to fortify or end turn
    // 40% chance to fortify if possible, 60% end turn
    // NOSONAR: Math.random() is safe for game AI decisions, not cryptographic use
    if (possibleFortifies.length > 0 && Math.random() < 0.4) {
      const fortify = possibleFortifies[Math.floor(Math.random() * possibleFortifies.length)]; // NOSONAR
      return {
        type: 'fortify',
        fromTerritoryId: fortify.from,
        toTerritoryId: fortify.to,
        troops: fortify.troops,
      };
    }

    // End turn
    return { type: 'end-turn' };
  }

  return { type: 'end-turn' };
}

/**
 * Check if AI should take a turn
 */
export function shouldAITakeTurn(gameState: GameState): boolean {
  if (gameState.winner) return false;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  return currentPlayer.isAI;
}
