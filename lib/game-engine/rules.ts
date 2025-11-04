import type {
  Territory,
  Player,
  TerritoryName,
  ContinentName,
} from '@/types/game';
import { CONTINENTS, getContinentBonus } from '@/constants/map';

/**
 * Calculate reinforcement armies for a player at the start of their turn
 * Based on: territories owned / 3 + continent bonuses (minimum 3)
 */
export function calculateReinforcements(
  player: Player,
  territories: Territory[]
): number {
  const playerTerritories = territories.filter((t) => t.owner_id === player.id);
  const territoryCount = playerTerritories.length;

  // Base reinforcement: territories / 3 (minimum 3)
  let reinforcements = Math.max(3, Math.floor(territoryCount / 3));

  // Add continent bonuses
  const continentBonuses = calculateContinentBonuses(
    player.id,
    playerTerritories
  );
  reinforcements += continentBonuses;

  return reinforcements;
}

/**
 * Calculate continent bonuses for a player
 */
export function calculateContinentBonuses(
  playerId: string,
  playerTerritories: Territory[]
): number {
  let bonus = 0;

  const playerTerritoryNames = new Set(
    playerTerritories.map((t) => t.territory_name)
  );

  // Check each continent
  for (const continent of CONTINENTS) {
    const ownsAllTerritories = continent.territories.every((territoryName) =>
      playerTerritoryNames.has(territoryName)
    );

    if (ownsAllTerritories) {
      bonus += continent.bonus;
    }
  }

  return bonus;
}

/**
 * Check if a player owns an entire continent
 */
export function ownsContinent(
  playerId: string,
  continent: ContinentName,
  territories: Territory[]
): boolean {
  const continentDef = CONTINENTS.find((c) => c.name === continent);
  if (!continentDef) return false;

  const playerTerritoryNames = new Set(
    territories.filter((t) => t.owner_id === playerId).map((t) => t.territory_name)
  );

  return continentDef.territories.every((territoryName) =>
    playerTerritoryNames.has(territoryName)
  );
}

/**
 * Check if a player has been eliminated
 */
export function isPlayerEliminated(
  playerId: string,
  territories: Territory[]
): boolean {
  return !territories.some((t) => t.owner_id === playerId);
}

/**
 * Get the winner of the game (if any)
 * Returns null if game is still ongoing
 */
export function getWinner(
  players: Player[],
  territories: Territory[]
): Player | null {
  // Filter out eliminated players
  const activePlayers = players.filter(
    (p) => !p.is_eliminated && !isPlayerEliminated(p.id, territories)
  );

  // Winner is determined when only 1 player remains
  if (activePlayers.length === 1) {
    return activePlayers[0];
  }

  return null;
}

/**
 * Fisher-Yates shuffle algorithm for uniform random distribution
 *
 * CRITICAL: Do NOT use .sort(() => Math.random() - 0.5) as it creates biased results
 * This implementation guarantees every permutation is equally likely.
 *
 * Time Complexity: O(n)
 * Space Complexity: O(1) in-place
 *
 * @see https://en.wikipedia.org/wiki/Fisher–Yates_shuffle
 * @see https://bost.ocks.org/mike/shuffle/
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Distribute territories randomly at game start using Fisher-Yates shuffle
 *
 * This ensures fair and unbiased territory distribution among all players.
 * Every territory has an equal chance of being assigned to any player.
 */
export function distributeTerritoriesRandomly(
  allTerritoryNames: TerritoryName[],
  players: Player[]
): Map<TerritoryName, string> {
  const shuffled = fisherYatesShuffle(allTerritoryNames);
  const distribution = new Map<TerritoryName, string>();

  shuffled.forEach((territoryName, index) => {
    const playerIndex = index % players.length;
    distribution.set(territoryName, players[playerIndex].id);
  });

  return distribution;
}

/**
 * Calculate initial armies for players based on player count
 */
export function calculateInitialArmies(playerCount: number): number {
  switch (playerCount) {
    case 2:
      return 40;
    case 3:
      return 35;
    case 4:
      return 30;
    case 5:
      return 25;
    case 6:
      return 20;
    default:
      return 30; // Default to 4-player
  }
}
