/**
 * Game move validation logic
 */

import type { GameState, MoveValidation, TerritoryId, Territory } from './types';
import { areTerritoriesAdjacent } from './map';

/**
 * Validate an attack move
 */
export function validateAttack(
  gameState: GameState,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId
): MoveValidation {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const fromTerritory = gameState.territories.find((t) => t.id === fromTerritoryId);
  const toTerritory = gameState.territories.find((t) => t.id === toTerritoryId);

  if (!fromTerritory || !toTerritory) {
    return { valid: false, error: 'Territory not found' };
  }

  // Must own the attacking territory
  if (fromTerritory.ownerId !== currentPlayer.id) {
    return { valid: false, error: 'You do not own the attacking territory' };
  }

  // Cannot attack your own territory
  if (toTerritory.ownerId === currentPlayer.id) {
    return { valid: false, error: 'Cannot attack your own territory' };
  }

  // Must have at least 2 troops to attack (1 must remain)
  if (fromTerritory.troops < 2) {
    return { valid: false, error: 'Need at least 2 troops to attack' };
  }

  // Territories must be adjacent
  if (!areTerritoriesAdjacent(fromTerritoryId, toTerritoryId)) {
    return { valid: false, error: 'Territories are not adjacent' };
  }

  return { valid: true };
}

/**
 * Validate a fortify move (moving troops between your own territories)
 */
export function validateFortify(
  gameState: GameState,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId,
  troopCount: number
): MoveValidation {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const fromTerritory = gameState.territories.find((t) => t.id === fromTerritoryId);
  const toTerritory = gameState.territories.find((t) => t.id === toTerritoryId);

  if (!fromTerritory || !toTerritory) {
    return { valid: false, error: 'Territory not found' };
  }

  // Must own both territories
  if (fromTerritory.ownerId !== currentPlayer.id) {
    return { valid: false, error: 'You do not own the source territory' };
  }

  if (toTerritory.ownerId !== currentPlayer.id) {
    return { valid: false, error: 'You do not own the destination territory' };
  }

  // Must have enough troops (at least 1 must remain)
  if (fromTerritory.troops <= troopCount) {
    return { valid: false, error: 'Must leave at least 1 troop behind' };
  }

  // Troop count must be positive
  if (troopCount < 1) {
    return { valid: false, error: 'Must move at least 1 troop' };
  }

  // Territories must be connected through owned territories
  if (!areTerritoriesConnected(gameState, fromTerritoryId, toTerritoryId, currentPlayer.id)) {
    return { valid: false, error: 'Territories are not connected through your territories' };
  }

  return { valid: true };
}

/**
 * Check if two territories are connected through owned territories using BFS
 */
function areTerritoriesConnected(
  gameState: GameState,
  fromId: TerritoryId,
  toId: TerritoryId,
  playerId: string
): boolean {
  if (fromId === toId) return true;

  const visited = new Set<TerritoryId>();
  const queue: TerritoryId[] = [fromId];
  visited.add(fromId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (currentId === toId) {
      return true;
    }

    const currentTerritory = gameState.territories.find((t) => t.id === currentId);
    if (!currentTerritory) continue;

    // Add adjacent owned territories to queue
    for (const adjacentId of currentTerritory.adjacentTerritories) {
      if (!visited.has(adjacentId)) {
        const adjacentTerritory = gameState.territories.find((t) => t.id === adjacentId);
        if (adjacentTerritory && adjacentTerritory.ownerId === playerId) {
          visited.add(adjacentId);
          queue.push(adjacentId);
        }
      }
    }
  }

  return false;
}

/**
 * Check if game is over (one player controls all territories)
 */
export function checkWinner(gameState: GameState): string | null {
  const territoriesByOwner = new Map<string, number>();

  for (const territory of gameState.territories) {
    const count = territoriesByOwner.get(territory.ownerId) || 0;
    territoriesByOwner.set(territory.ownerId, count + 1);
  }

  // Winner is player who owns all 6 territories
  for (const [ownerId, count] of territoriesByOwner.entries()) {
    if (count === 6) {
      return ownerId;
    }
  }

  return null;
}
