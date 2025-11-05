import { faker } from '@faker-js/faker';
import type { Player, PlayerColor } from '@/types/game';

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

/**
 * Create a test player with sensible defaults
 * @param overrides - Partial player object to override defaults
 * @returns A complete Player object for testing
 */
export const createTestPlayer = (overrides: Partial<Player> = {}): Player => {
  const now = new Date().toISOString();
  const turnOrder = overrides.turn_order ?? 0;

  return {
    id: faker.string.uuid(),
    game_id: faker.string.uuid(),
    username: faker.internet.username(),
    color: PLAYER_COLORS[turnOrder % PLAYER_COLORS.length],
    turn_order: turnOrder,
    armies_available: 0,
    is_eliminated: false,
    created_at: now,
    ...overrides,
  };
};

/**
 * Create multiple players for a game
 * @param gameId - The game ID all players belong to
 * @param count - Number of players (2-6)
 * @param options - Optional configuration
 */
export const createTestPlayers = (
  gameId: string,
  count: number,
  options: { withArmies?: boolean } = {}
): Player[] => {
  if (count < 2 || count > 6) {
    throw new Error('Player count must be between 2 and 6');
  }

  return Array.from({ length: count }, (_, index) => {
    const player = createTestPlayer({
      game_id: gameId,
      turn_order: index,
      color: PLAYER_COLORS[index],
    });

    // Optionally add armies based on player count
    if (options.withArmies) {
      const initialArmies = getInitialArmies(count);
      player.armies_available = initialArmies;
    }

    return player;
  });
};

/**
 * Create an eliminated player
 */
export const createEliminatedPlayer = (overrides: Partial<Player> = {}): Player => {
  return createTestPlayer({
    is_eliminated: true,
    armies_available: 0,
    ...overrides,
  });
};

/**
 * Get initial army count based on player count (Risk rules)
 */
function getInitialArmies(playerCount: number): number {
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
      return 30;
  }
}
