import { z } from 'zod';
import { validateUsername } from './profanity-filter';

/**
 * Username validation schema
 * Ensures usernames are safe and display-friendly
 */
export const usernameSchema = z
  .string()
  .min(2, 'Username must be at least 2 characters')
  .max(16, 'Username must be at most 16 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, hyphens, and underscores'
  )
  .trim()
  .refine((username) => !validateUsername(username), {
    message: 'Username contains inappropriate language',
  });

/**
 * UUID validation schemas for IDs
 */
export const gameIdSchema = z.string().uuid('Invalid game ID');
export const playerIdSchema = z.string().uuid('Invalid player ID');
export const territoryIdSchema = z.string().uuid('Invalid territory ID');

/**
 * Army count validation
 * Prevents negative armies or unreasonably large numbers
 */
export const armyCountSchema = z
  .number()
  .int('Army count must be a whole number')
  .min(1, 'Must place at least 1 army')
  .max(100, 'Cannot place more than 100 armies at once');

/**
 * Max players validation
 */
export const maxPlayersSchema = z
  .number()
  .int()
  .min(2, 'Must allow at least 2 players')
  .max(6, 'Cannot have more than 6 players');

/**
 * Server Action input validation schemas
 */

export const placeArmiesSchema = z.object({
  gameId: gameIdSchema,
  playerId: playerIdSchema,
  territoryId: territoryIdSchema,
  count: armyCountSchema,
});

export const attackSchema = z.object({
  gameId: gameIdSchema,
  playerId: playerIdSchema,
  fromTerritoryId: territoryIdSchema,
  toTerritoryId: territoryIdSchema,
});

export const fortifySchema = z.object({
  gameId: gameIdSchema,
  playerId: playerIdSchema,
  fromTerritoryId: territoryIdSchema,
  toTerritoryId: territoryIdSchema,
  armyCount: armyCountSchema,
});

export const endTurnSchema = z.object({
  gameId: gameIdSchema,
  playerId: playerIdSchema,
});

export const changePhaseSchema = z.object({
  gameId: gameIdSchema,
  playerId: playerIdSchema,
  newPhase: z.enum(['attack', 'fortify']),
});

export const startGameSchema = z.object({
  gameId: gameIdSchema,
});

export const joinGameSchema = z.object({
  gameId: gameIdSchema,
  username: usernameSchema,
  color: z.string().min(3).max(20),
});

export const createGameSchema = z.object({
  maxPlayers: maxPlayersSchema,
});
