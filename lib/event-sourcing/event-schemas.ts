/**
 * Event Validation Schemas
 *
 * Zod schemas for validating event payloads and state transitions.
 * Ensures event data integrity and catches invalid events early.
 */

import { z } from 'zod';
import type { GameEventType } from './EventStore';

/**
 * UUID schema for ID validation
 */
const uuidSchema = z.string().uuid();

/**
 * Game status values
 */
const gameStatusSchema = z.enum(['waiting', 'setup', 'playing', 'finished']);

/**
 * Game phase values
 */
const gamePhaseSchema = z.enum(['reinforcement', 'attack', 'fortify']);

/**
 * Player color values
 */
const playerColorSchema = z.enum([
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
]);

/**
 * Event payload schemas by event type
 */
export const eventPayloadSchemas = {
  game_created: z.object({
    status: gameStatusSchema.optional(),
  }),

  game_started: z.object({
    current_player_order: z.number().int().min(0).optional(),
  }),

  player_joined: z.object({
    player_id: uuidSchema,
    username: z.string().min(1).max(50),
    color: playerColorSchema,
    turn_order: z.number().int().min(0),
  }),

  territory_claimed: z.object({
    territory_id: uuidSchema,
    owner_id: uuidSchema,
  }),

  setup_army_placed: z.object({
    territory_id: uuidSchema,
    count: z.number().int().min(1),
    player_id: uuidSchema,
  }),

  turn_started: z.object({
    player_order: z.number().int().min(0),
  }),

  reinforcement_calculated: z.object({
    player_id: uuidSchema,
    armies: z.number().int().min(0),
  }),

  army_placed: z.object({
    territory_id: uuidSchema,
    count: z.number().int().min(1),
    player_id: uuidSchema,
  }),

  phase_changed: z.object({
    new_phase: gamePhaseSchema,
  }),

  territory_attacked: z.object({
    from_territory_id: uuidSchema,
    to_territory_id: uuidSchema,
    attacker_losses: z.number().int().min(0),
    defender_losses: z.number().int().min(0),
  }),

  territory_conquered: z.object({
    territory_id: uuidSchema,
    new_owner_id: uuidSchema,
    armies_moved: z.number().int().min(1),
  }),

  player_eliminated: z.object({
    player_id: uuidSchema,
  }),

  army_fortified: z.object({
    from_territory_id: uuidSchema,
    to_territory_id: uuidSchema,
    count: z.number().int().min(1),
  }),

  turn_ended: z.object({
    next_player_order: z.number().int().min(0).optional(),
  }),

  game_finished: z.object({
    winner_id: uuidSchema,
  }),
} as const;

/**
 * Validate event payload against its schema
 *
 * @param eventType Event type to validate
 * @param payload Event payload data
 * @returns Validation result with parsed data or error
 */
export function validateEventPayload(
  eventType: GameEventType,
  payload: unknown
): { success: true; data: any } | { success: false; error: string } {
  const schema = eventPayloadSchemas[eventType];

  if (!schema) {
    return {
      success: false,
      error: `No validation schema found for event type: ${eventType}`,
    };
  }

  try {
    const parsed = schema.parse(payload);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        error: `Invalid payload for ${eventType}: ${errors}`,
      };
    }
    return {
      success: false,
      error: `Validation failed for ${eventType}: ${String(error)}`,
    };
  }
}

/**
 * Valid state transitions for game status
 */
const statusTransitions: Record<string, string[]> = {
  waiting: ['setup'],
  setup: ['playing'],
  playing: ['finished'],
  finished: [],
};

/**
 * Valid phase transitions
 */
const phaseTransitions: Record<string, string[]> = {
  reinforcement: ['attack', 'fortify', 'reinforcement'],
  attack: ['fortify', 'reinforcement'],
  fortify: ['reinforcement'],
};

/**
 * Event types that can trigger status transitions
 */
const statusTransitionEvents: Record<string, string[]> = {
  waiting: ['game_started'],
  setup: ['turn_started'],
  playing: ['game_finished'],
};

/**
 * Validate state transition for an event
 *
 * @param eventType Event that triggers the transition
 * @param currentStatus Current game status
 * @param currentPhase Current game phase
 * @param payload Event payload (may contain new_phase)
 * @returns Validation result
 */
export function validateEventTransition(
  eventType: GameEventType,
  currentStatus: string,
  currentPhase: string,
  payload: any
): { valid: true } | { valid: false; reason: string } {
  // Validate phase transitions
  if (eventType === 'phase_changed') {
    const newPhase = payload.new_phase;
    const validNextPhases = phaseTransitions[currentPhase];

    if (!validNextPhases || !validNextPhases.includes(newPhase)) {
      return {
        valid: false,
        reason: `Invalid phase transition: ${currentPhase} → ${newPhase}`,
      };
    }
  }

  // Validate status transitions
  const allowedEvents = statusTransitionEvents[currentStatus];
  if (allowedEvents && allowedEvents.includes(eventType)) {
    // Status transition event - always valid if event type matches
    return { valid: true };
  }

  // Most events are valid in any state
  // Only phase_changed has strict validation above
  return { valid: true };
}
