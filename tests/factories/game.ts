import { faker } from '@faker-js/faker';
import type { Game, GameStatus, GamePhase } from '@/types/game';

/**
 * Create a test game with sensible defaults
 * @param overrides - Partial game object to override defaults
 * @returns A complete Game object for testing
 */
export const createTestGame = (overrides: Partial<Game> = {}): Game => {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    status: 'playing' as GameStatus,
    phase: 'attack' as GamePhase,
    current_turn: 1,
    current_player_order: 0,
    winner_id: null,
    max_players: 4,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Create a game in waiting status (lobby)
 */
export const createWaitingGame = (overrides: Partial<Game> = {}): Game => {
  return createTestGame({
    status: 'waiting',
    phase: 'reinforcement',
    current_turn: 0,
    current_player_order: 0,
    ...overrides,
  });
};

/**
 * Create a game in setup phase (initial placement)
 */
export const createSetupGame = (overrides: Partial<Game> = {}): Game => {
  return createTestGame({
    status: 'setup',
    phase: 'reinforcement',
    current_turn: 1,
    ...overrides,
  });
};

/**
 * Create a finished game with a winner
 */
export const createFinishedGame = (winnerId: string, overrides: Partial<Game> = {}): Game => {
  return createTestGame({
    status: 'finished',
    phase: 'attack',
    winner_id: winnerId,
    ...overrides,
  });
};

/**
 * Create multiple games for testing
 */
export const createTestGames = (count: number): Game[] => {
  return Array.from({ length: count }, () => createTestGame());
};
