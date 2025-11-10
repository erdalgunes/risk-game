import { describe, it, expect } from 'vitest';
import { validateEventPayload, validateEventTransition } from '../event-schemas';
import type { GameEventType } from '../EventStore';

describe('Event Validation', () => {
  describe('validateEventPayload', () => {
    describe('game_created', () => {
      it('should validate valid game_created event', () => {
        const result = validateEventPayload('game_created', {
          status: 'waiting',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('waiting');
        }
      });

      it('should accept empty payload for game_created', () => {
        const result = validateEventPayload('game_created', {});
        expect(result.success).toBe(true);
      });

      it('should reject invalid status', () => {
        const result = validateEventPayload('game_created', {
          status: 'invalid-status',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Invalid');
        }
      });
    });

    describe('player_joined', () => {
      it('should validate valid player_joined event', () => {
        const result = validateEventPayload('player_joined', {
          player_id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'TestPlayer',
          color: 'red',
          turn_order: 0,
        });

        expect(result.success).toBe(true);
      });

      it('should reject missing player_id', () => {
        const result = validateEventPayload('player_joined', {
          username: 'TestPlayer',
          color: 'red',
          turn_order: 0,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('player_id');
        }
      });

      it('should reject invalid UUID format', () => {
        const result = validateEventPayload('player_joined', {
          player_id: 'not-a-uuid',
          username: 'TestPlayer',
          color: 'red',
          turn_order: 0,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('player_id');
        }
      });

      it('should reject invalid color', () => {
        const result = validateEventPayload('player_joined', {
          player_id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'TestPlayer',
          color: 'pink',
          turn_order: 0,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('color');
        }
      });

      it('should reject negative turn_order', () => {
        const result = validateEventPayload('player_joined', {
          player_id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'TestPlayer',
          color: 'red',
          turn_order: -1,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('territory_claimed', () => {
      it('should validate valid territory_claimed event', () => {
        const result = validateEventPayload('territory_claimed', {
          territory_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: '223e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.success).toBe(true);
      });

      it('should reject missing territory_id', () => {
        const result = validateEventPayload('territory_claimed', {
          owner_id: '223e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('army_placed', () => {
      it('should validate valid army_placed event', () => {
        const result = validateEventPayload('army_placed', {
          territory_id: '123e4567-e89b-12d3-a456-426614174000',
          count: 3,
          player_id: '223e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.success).toBe(true);
      });

      it('should reject zero or negative count', () => {
        const result = validateEventPayload('army_placed', {
          territory_id: '123e4567-e89b-12d3-a456-426614174000',
          count: 0,
          player_id: '223e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('territory_attacked', () => {
      it('should validate valid territory_attacked event', () => {
        const result = validateEventPayload('territory_attacked', {
          from_territory_id: '123e4567-e89b-12d3-a456-426614174000',
          to_territory_id: '223e4567-e89b-12d3-a456-426614174000',
          attacker_losses: 1,
          defender_losses: 2,
        });

        expect(result.success).toBe(true);
      });

      it('should accept zero losses', () => {
        const result = validateEventPayload('territory_attacked', {
          from_territory_id: '123e4567-e89b-12d3-a456-426614174000',
          to_territory_id: '223e4567-e89b-12d3-a456-426614174000',
          attacker_losses: 0,
          defender_losses: 0,
        });

        expect(result.success).toBe(true);
      });

      it('should reject negative losses', () => {
        const result = validateEventPayload('territory_attacked', {
          from_territory_id: '123e4567-e89b-12d3-a456-426614174000',
          to_territory_id: '223e4567-e89b-12d3-a456-426614174000',
          attacker_losses: -1,
          defender_losses: 2,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('phase_changed', () => {
      it('should validate valid phase_changed event', () => {
        const result = validateEventPayload('phase_changed', {
          new_phase: 'attack',
        });

        expect(result.success).toBe(true);
      });

      it('should reject invalid phase', () => {
        const result = validateEventPayload('phase_changed', {
          new_phase: 'invalid-phase',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('game_finished', () => {
      it('should validate valid game_finished event', () => {
        const result = validateEventPayload('game_finished', {
          winner_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.success).toBe(true);
      });

      it('should reject missing winner_id', () => {
        const result = validateEventPayload('game_finished', {});

        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateEventTransition', () => {
    describe('phase transitions', () => {
      it('should allow valid phase transition: reinforcement -> attack', () => {
        const result = validateEventTransition('phase_changed', 'playing', 'reinforcement', {
          new_phase: 'attack',
        });

        expect(result.valid).toBe(true);
      });

      it('should allow valid phase transition: attack -> fortify', () => {
        const result = validateEventTransition('phase_changed', 'playing', 'attack', {
          new_phase: 'fortify',
        });

        expect(result.valid).toBe(true);
      });

      it('should allow valid phase transition: fortify -> reinforcement', () => {
        const result = validateEventTransition('phase_changed', 'playing', 'fortify', {
          new_phase: 'reinforcement',
        });

        expect(result.valid).toBe(true);
      });

      it('should allow skipping phases: reinforcement -> fortify', () => {
        const result = validateEventTransition('phase_changed', 'playing', 'reinforcement', {
          new_phase: 'fortify',
        });

        expect(result.valid).toBe(true);
      });

      it('should reject invalid phase transition: fortify -> attack', () => {
        const result = validateEventTransition('phase_changed', 'playing', 'fortify', {
          new_phase: 'attack',
        });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toContain('Invalid phase transition');
        }
      });
    });

    describe('status transitions', () => {
      it('should allow game_started in waiting status', () => {
        const result = validateEventTransition('game_started', 'waiting', 'reinforcement', {});

        expect(result.valid).toBe(true);
      });

      it('should allow turn_started in setup status', () => {
        const result = validateEventTransition('turn_started', 'setup', 'reinforcement', {});

        expect(result.valid).toBe(true);
      });

      it('should allow game_finished in playing status', () => {
        const result = validateEventTransition('game_finished', 'playing', 'attack', {
          winner_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.valid).toBe(true);
      });
    });

    describe('general events', () => {
      it('should allow army_placed in any status', () => {
        const result = validateEventTransition('army_placed', 'playing', 'reinforcement', {});

        expect(result.valid).toBe(true);
      });

      it('should allow territory_attacked in any status', () => {
        const result = validateEventTransition('territory_attacked', 'playing', 'attack', {});

        expect(result.valid).toBe(true);
      });
    });
  });
});
