import type { Territory, Player, Game, TerritoryName, GamePhase } from '@/types/game';
import { areTerritoriesAdjacent, getTerritoryDefinition } from '@/constants/map';

/**
 * Validate if a player can attack from one territory to another
 */
export function canAttack(
  game: Game,
  attacker: Player,
  fromTerritory: Territory,
  toTerritory: Territory
): { valid: boolean; reason?: string } {
  // Must be in attack phase
  if (game.phase !== 'attack') {
    return { valid: false, reason: 'Not in attack phase' };
  }

  // Must be current player
  if (attacker.turn_order !== game.current_player_order) {
    return { valid: false, reason: 'Not your turn' };
  }

  // Must own the attacking territory
  if (fromTerritory.owner_id !== attacker.id) {
    return { valid: false, reason: 'You do not own the attacking territory' };
  }

  // Cannot attack your own territory
  if (toTerritory.owner_id === attacker.id) {
    return { valid: false, reason: 'Cannot attack your own territory' };
  }

  // Must have at least 2 armies in attacking territory
  if (fromTerritory.army_count < 2) {
    return {
      valid: false,
      reason: 'Must have at least 2 armies to attack',
    };
  }

  // Territories must be adjacent
  if (!areTerritoriesAdjacent(fromTerritory.territory_name, toTerritory.territory_name)) {
    return { valid: false, reason: 'Territories are not adjacent' };
  }

  return { valid: true };
}

/**
 * Validate if a player can fortify from one territory to another
 */
export function canFortify(
  game: Game,
  player: Player,
  fromTerritory: Territory,
  toTerritory: Territory,
  armyCount: number,
  allTerritories: Territory[]
): { valid: boolean; reason?: string } {
  // Must be in fortify phase
  if (game.phase !== 'fortify') {
    return { valid: false, reason: 'Not in fortify phase' };
  }

  // Must be current player
  if (player.turn_order !== game.current_player_order) {
    return { valid: false, reason: 'Not your turn' };
  }

  // Must own both territories
  if (fromTerritory.owner_id !== player.id) {
    return { valid: false, reason: 'You do not own the source territory' };
  }

  if (toTerritory.owner_id !== player.id) {
    return {
      valid: false,
      reason: 'You do not own the destination territory',
    };
  }

  // Must leave at least 1 army
  if (fromTerritory.army_count - armyCount < 1) {
    return {
      valid: false,
      reason: 'Must leave at least 1 army in source territory',
    };
  }

  // Territories must be connected through player's territories
  if (!areTerritoriesConnected(fromTerritory, toTerritory, player.id, allTerritories)) {
    return {
      valid: false,
      reason: 'Territories are not connected through your territories',
    };
  }

  return { valid: true };
}

/**
 * Check if two territories are connected through a player's territories
 * Uses BFS to find a path
 */
export function areTerritoriesConnected(
  from: Territory,
  to: Territory,
  playerId: string,
  allTerritories: Territory[]
): boolean {
  if (from.id === to.id) return true;

  const playerTerritories = new Set(
    allTerritories.filter((t) => t.owner_id === playerId).map((t) => t.territory_name)
  );

  const visited = new Set<TerritoryName>();
  const queue: TerritoryName[] = [from.territory_name];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === to.territory_name) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const def = getTerritoryDefinition(current);
    if (!def) continue;

    // Add adjacent territories owned by player
    for (const adjacent of def.adjacentTerritories) {
      if (playerTerritories.has(adjacent) && !visited.has(adjacent)) {
        queue.push(adjacent);
      }
    }
  }

  return false;
}

/**
 * Validate if a player can place armies on a territory
 */
export function canPlaceArmies(
  game: Game,
  player: Player,
  territory: Territory,
  armyCount: number
): { valid: boolean; reason?: string } {
  // Must be in reinforcement phase or setup
  if (game.phase !== 'reinforcement' && game.status !== 'setup') {
    return { valid: false, reason: 'Not in reinforcement or setup phase' };
  }

  // Must be current player
  if (player.turn_order !== game.current_player_order) {
    return { valid: false, reason: 'Not your turn' };
  }

  // Must own the territory
  if (territory.owner_id !== player.id) {
    return { valid: false, reason: 'You do not own this territory' };
  }

  // Must have enough available armies
  if (player.armies_available < armyCount) {
    return {
      valid: false,
      reason: `Not enough armies available (have ${player.armies_available}, need ${armyCount})`,
    };
  }

  // Army count must be positive
  if (armyCount < 1) {
    return { valid: false, reason: 'Must place at least 1 army' };
  }

  return { valid: true };
}

/**
 * Validate if it's a player's turn
 */
export function isPlayerTurn(game: Game, player: Player): boolean {
  return player.turn_order === game.current_player_order;
}
