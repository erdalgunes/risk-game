import { faker } from '@faker-js/faker';
import type { Territory, TerritoryName, Player } from '@/types/game';
import { TERRITORIES } from '@/constants/map';

/**
 * Create a test territory with sensible defaults
 * @param overrides - Partial territory object to override defaults
 * @returns A complete Territory object for testing
 */
export const createTestTerritory = (overrides: Partial<Territory> = {}): Territory => {
  const now = new Date().toISOString();
  const randomTerritory = TERRITORIES[Math.floor(Math.random() * TERRITORIES.length)];

  return {
    id: faker.string.uuid(),
    game_id: faker.string.uuid(),
    territory_name: randomTerritory.name,
    owner_id: faker.string.uuid(),
    army_count: 1,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Create territories for all 42 Risk territories
 * @param gameId - The game ID
 * @param ownerId - Optional owner ID (null = unclaimed)
 */
export const createAllTerritories = (
  gameId: string,
  ownerId: string | null = null
): Territory[] => {
  return TERRITORIES.map((territoryDef) =>
    createTestTerritory({
      game_id: gameId,
      territory_name: territoryDef.name,
      owner_id: ownerId,
      army_count: 1,
    })
  );
};

/**
 * Distribute territories among players randomly (mimics game setup)
 * @param gameId - The game ID
 * @param players - Array of players
 * @returns Array of territories distributed among players
 */
export const createDistributedTerritories = (gameId: string, players: Player[]): Territory[] => {
  if (players.length < 2 || players.length > 6) {
    throw new Error('Player count must be between 2 and 6');
  }

  // Shuffle territories
  const shuffledTerritories = [...TERRITORIES].sort(() => Math.random() - 0.5);

  return shuffledTerritories.map((territoryDef, index) => {
    const playerIndex = index % players.length;
    const owner = players[playerIndex];

    return createTestTerritory({
      game_id: gameId,
      territory_name: territoryDef.name,
      owner_id: owner.id,
      army_count: 1,
    });
  });
};

/**
 * Create territories where one player owns all
 * @param gameId - The game ID
 * @param ownerId - The player who owns all territories
 */
export const createPlayerOwnedTerritories = (gameId: string, ownerId: string): Territory[] => {
  return createAllTerritories(gameId, ownerId);
};

/**
 * Create territories for a specific continent
 * @param gameId - The game ID
 * @param continentTerritories - Array of territory names for the continent
 * @param ownerId - Optional owner ID
 */
export const createContinentTerritories = (
  gameId: string,
  continentTerritories: TerritoryName[],
  ownerId: string | null = null
): Territory[] => {
  return continentTerritories.map((territoryName) =>
    createTestTerritory({
      game_id: gameId,
      territory_name: territoryName,
      owner_id: ownerId,
      army_count: 1,
    })
  );
};

/**
 * Create two adjacent territories with specified owners (for attack/fortify testing)
 */
export const createAdjacentTerritories = (
  gameId: string,
  territory1Name: TerritoryName,
  territory2Name: TerritoryName,
  owner1Id: string,
  owner2Id: string,
  armies1: number = 2,
  armies2: number = 1
): [Territory, Territory] => {
  return [
    createTestTerritory({
      game_id: gameId,
      territory_name: territory1Name,
      owner_id: owner1Id,
      army_count: armies1,
    }),
    createTestTerritory({
      game_id: gameId,
      territory_name: territory2Name,
      owner_id: owner2Id,
      army_count: armies2,
    }),
  ];
};
