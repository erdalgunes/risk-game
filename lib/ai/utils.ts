import type { Territory, TerritoryName } from '@/types/game';
import type { AnalyzedTerritory } from '@/types/ai';
import { TERRITORIES, areTerritoriesAdjacent } from '@/constants/map';
import { areTerritoriesConnected } from '@/lib/game-engine/validation';

/**
 * Check if a territory has adjacent enemies
 */
export function hasAdjacentEnemy(
  territory: Territory,
  allTerritories: Territory[]
): boolean {
  const adjacentEnemies = getAdjacentEnemyTerritories(territory, allTerritories);
  return adjacentEnemies.length > 0;
}

/**
 * Get all enemy territories adjacent to a given territory
 */
export function getAdjacentEnemyTerritories(
  territory: Territory,
  allTerritories: Territory[]
): Territory[] {
  return allTerritories.filter(
    (t) =>
      t.owner_id !== territory.owner_id &&
      areTerritoriesAdjacent(territory.territory_name, t.territory_name)
  );
}

/**
 * Get all allied territories adjacent to a given territory
 */
export function getAdjacentAlliedTerritories(
  territory: Territory,
  allTerritories: Territory[]
): Territory[] {
  return allTerritories.filter(
    (t) =>
      t.owner_id === territory.owner_id &&
      t.id !== territory.id &&
      areTerritoriesAdjacent(territory.territory_name, t.territory_name)
  );
}

/**
 * Get all territories adjacent to a given territory
 */
export function getAdjacentTerritories(
  territory: Territory,
  allTerritories: Territory[]
): Territory[] {
  return allTerritories.filter(
    (t) =>
      t.id !== territory.id &&
      areTerritoriesAdjacent(territory.territory_name, t.territory_name)
  );
}

/**
 * Analyze a territory for AI decision making
 */
export function analyzeTerritory(
  territory: Territory,
  allTerritories: Territory[]
): AnalyzedTerritory {
  const adjacentEnemies = getAdjacentEnemyTerritories(territory, allTerritories);
  const adjacentAllies = getAdjacentAlliedTerritories(territory, allTerritories);
  const isBorder = adjacentEnemies.length > 0;
  const isInterior = !isBorder;

  // Simple strategic value calculation
  let strategicValue = 0;
  strategicValue += territory.army_count; // More armies = more valuable
  strategicValue += adjacentEnemies.length * 2; // Border territories more valuable
  strategicValue += adjacentAllies.length; // Connected territories more valuable

  return {
    ...territory,
    adjacentEnemies,
    adjacentAllies,
    isBorder,
    isInterior,
    strategicValue,
  };
}

/**
 * Get all territories owned by a player
 */
export function getPlayerTerritories(
  playerId: string,
  allTerritories: Territory[]
): Territory[] {
  return allTerritories.filter((t) => t.owner_id === playerId);
}

/**
 * Get all enemy territories (not owned by player)
 */
export function getEnemyTerritories(
  playerId: string,
  allTerritories: Territory[]
): Territory[] {
  return allTerritories.filter((t) => t.owner_id !== playerId);
}

/**
 * Get border territories (territories with adjacent enemies)
 */
export function getBorderTerritories(
  playerId: string,
  allTerritories: Territory[]
): Territory[] {
  const myTerritories = getPlayerTerritories(playerId, allTerritories);
  return myTerritories.filter((t) => hasAdjacentEnemy(t, allTerritories));
}

/**
 * Get interior territories (territories with no adjacent enemies)
 */
export function getInteriorTerritories(
  playerId: string,
  allTerritories: Territory[]
): Territory[] {
  const myTerritories = getPlayerTerritories(playerId, allTerritories);
  return myTerritories.filter((t) => !hasAdjacentEnemy(t, allTerritories));
}

/**
 * Check if two territories are connected through player's territory network
 */
export function checkTerritoriesConnected(
  fromTerritory: Territory,
  toTerritory: Territory,
  playerId: string,
  allTerritories: Territory[]
): boolean {
  return areTerritoriesConnected(
    fromTerritory,
    toTerritory,
    playerId,
    allTerritories
  );
}

/**
 * Get random element from array
 */
export function randomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  // NOSONAR: Math.random() is safe for game AI decisions (not cryptographic use)
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random integer between min (inclusive) and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  // NOSONAR: Math.random() is safe for game AI decisions (not cryptographic use)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // NOSONAR: Math.random() is safe for game AI decisions (not cryptographic use)
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Add delay (for simulating AI thinking time)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if player name indicates it's an AI
 */
export function isAIPlayer(username: string): boolean {
  return username.startsWith('AI_');
}
