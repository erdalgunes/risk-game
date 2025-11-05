import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestPlayer } from '@/tests/factories/player';
import { createTestGame } from '@/tests/factories/game';
import { createTestTerritory } from '@/tests/factories/territory';

// Mock modules
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

const mockEventStore = {
  getEvents: vi.fn(),
  replay: vi.fn(),
};

const mockCreateServerClient = vi.fn(() => mockSupabase);
const mockCreateEventStore = vi.fn(() => mockEventStore);
const mockVerifyPlayerSession = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockHeaders = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock('@/lib/event-sourcing/EventStore', () => ({
  createEventStore: mockCreateEventStore,
}));

vi.mock('@/lib/session/player-session', () => ({
  verifyPlayerSession: mockVerifyPlayerSession,
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  SERVER_RATE_LIMITS: {
    END_TURN: { requests: 10, window: 60000 },
  },
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

// Import after mocks
const { undoLastAction, checkUndoAvailability } = await import('../undo');

describe('Undo Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockVerifyPlayerSession.mockResolvedValue(true);
    mockHeaders.mockResolvedValue(new Headers());
  });

  describe('undoLastAction', () => {
    it('should successfully undo the last action', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';
      const game = createTestGame({ id: gameId });
      const player = createTestPlayer({ id: playerId, game_id: gameId });
      const territory = createTestTerritory({ owner_id: playerId });

      const events = [
        {
          id: 'event-1',
          game_id: gameId,
          player_id: playerId,
          event_type: 'army_placed',
          sequence_number: 1,
          payload: { territory_id: territory.id, count: 3 },
          created_at: new Date().toISOString(),
        },
      ];

      mockEventStore.getEvents.mockResolvedValue(events);
      mockEventStore.replay.mockResolvedValue({
        game,
        players: [player],
        territories: [territory],
      });

      // Mock RPC call for atomic undo
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Mock event deletion
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await undoLastAction(gameId, playerId);

      expect(result.success).toBe(true);
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);
      expect(mockEventStore.replay).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('apply_undo_state', expect.any(Object));
    });

    it('should reject undo when rate limit exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      });

      const result = await undoLastAction('game-123', 'player-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should reject undo when session invalid', async () => {
      mockVerifyPlayerSession.mockResolvedValue(false);

      const result = await undoLastAction('game-123', 'player-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid session');
    });

    it('should reject undo when no events exist', async () => {
      mockEventStore.getEvents.mockResolvedValue([]);

      const result = await undoLastAction('game-123', 'player-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No events to undo');
    });

    it('should reject undo when no player events found', async () => {
      const events = [
        {
          id: 'event-1',
          game_id: 'game-123',
          player_id: 'other-player',
          event_type: 'army_placed',
          sequence_number: 1,
          payload: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockEventStore.getEvents.mockResolvedValue(events);

      const result = await undoLastAction('game-123', 'player-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No actions to undo');
    });

    it('should handle database errors gracefully', async () => {
      const events = [
        {
          id: 'event-1',
          game_id: 'game-123',
          player_id: 'player-1',
          event_type: 'army_placed',
          sequence_number: 1,
          payload: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockEventStore.getEvents.mockResolvedValue(events);
      mockEventStore.replay.mockResolvedValue({
        game: createTestGame(),
        players: [createTestPlayer()],
        territories: [createTestTerritory()],
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await undoLastAction('game-123', 'player-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to apply undo state');
    });
  });

  describe('checkUndoAvailability', () => {
    it('should return available when player has undoable events', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      // Mock player existence check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: playerId },
          error: null,
        }),
      });

      const events = [
        {
          id: 'event-1',
          player_id: playerId,
          event_type: 'army_placed',
          sequence_number: 1,
        },
      ];

      mockEventStore.getEvents.mockResolvedValue(events);

      const result = await checkUndoAvailability(gameId, playerId);

      expect(result.available).toBe(true);
    });

    it('should return unavailable when player not in game', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const result = await checkUndoAvailability('game-123', 'player-1');

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Player not found');
    });

    it('should return unavailable when no events to undo', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'player-1' },
          error: null,
        }),
      });

      mockEventStore.getEvents.mockResolvedValue([]);

      const result = await checkUndoAvailability('game-123', 'player-1');

      expect(result.available).toBe(false);
      expect(result.reason).toContain('No actions to undo');
    });
  });
});
