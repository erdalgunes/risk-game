import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestGame } from '@/tests/factories/game';
import { createTestPlayer } from '@/tests/factories/player';
import { createTestTerritory } from '@/tests/factories/territory';

// Mock Supabase server client
const mockSupabase = {
  from: vi.fn(),
};

const mockCreateServerClient = vi.fn(() => mockSupabase);

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: mockCreateServerClient,
}));

// Mock player session verification
vi.mock('@/lib/session/player-session', () => ({
  verifyPlayerSession: vi.fn().mockResolvedValue({ valid: true }),
  getPlayerSession: vi.fn().mockResolvedValue({ playerId: '22222222-2222-4222-8222-222222222222' }),
}));

// Import after mocks are setup
const { endTurn } = await import('../game');

describe('endTurn Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should end turn successfully', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '22222222-2222-4222-8222-222222222222';

    const game = createTestGame({
      id: gameId,
      current_player_order: 0,
      current_turn: 5,
    });

    const players = [
      createTestPlayer({ id: playerId, turn_order: 0 }),
      createTestPlayer({ id: '33333333-3333-4333-8333-333333333333', turn_order: 1 }),
    ];

    const territories = [
      createTestTerritory({ owner_id: playerId }),
      createTestTerritory({ owner_id: '33333333-3333-4333-8333-333333333333' }),
    ];

    // Mock game query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    // Mock players query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    // Mock territories query for reinforcement calculation
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: territories,
        error: null,
      }),
    });

    // Mock next player update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock game update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const result = await endTurn(gameId, playerId);

    expect(result.success).toBe(true);
  });

  it('should fail if game not found', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '22222222-2222-4222-8222-222222222222';

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    });

    const result = await endTurn(gameId, playerId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Game not found');
  });

  it('should fail if not current player turn', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '33333333-3333-4333-8333-333333333333';

    const game = createTestGame({
      id: gameId,
      current_player_order: 0, // Player 1's turn
    });

    const players = [
      createTestPlayer({ id: '22222222-2222-4222-8222-222222222222', turn_order: 0 }),
      createTestPlayer({ id: playerId, turn_order: 1 }),
    ];

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    const result = await endTurn(gameId, playerId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  it('should advance to next player', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '22222222-2222-4222-8222-222222222222';

    const game = createTestGame({
      id: gameId,
      current_player_order: 0,
      current_turn: 5,
    });

    const players = [
      createTestPlayer({ id: playerId, turn_order: 0 }),
      createTestPlayer({ id: '33333333-3333-4333-8333-333333333333', turn_order: 1 }),
      createTestPlayer({ id: '44444444-4444-4444-8444-444444444444', turn_order: 2 }),
    ];

    const territories = [createTestTerritory({ owner_id: '33333333-3333-4333-8333-333333333333' })];

    let gameUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: territories,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        gameUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    await endTurn(gameId, playerId);

    expect(gameUpdate.current_player_order).toBe(1); // Next player
    expect(gameUpdate.current_turn).toBe(6); // Incremented
  });

  it('should wrap around to first player after last player', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '44444444-4444-4444-8444-444444444444';

    const game = createTestGame({
      id: gameId,
      current_player_order: 2, // Last player
      current_turn: 10,
    });

    const players = [
      createTestPlayer({ id: '22222222-2222-4222-8222-222222222222', turn_order: 0 }),
      createTestPlayer({ id: '33333333-3333-4333-8333-333333333333', turn_order: 1 }),
      createTestPlayer({ id: playerId, turn_order: 2 }),
    ];

    const territories = [createTestTerritory({ owner_id: '22222222-2222-4222-8222-222222222222' })];

    let gameUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: territories,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        gameUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    await endTurn(gameId, playerId);

    expect(gameUpdate.current_player_order).toBe(0); // Wrap to first
  });

  it('should calculate reinforcements for next player', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '22222222-2222-4222-8222-222222222222';

    const game = createTestGame({
      id: gameId,
      current_player_order: 0,
    });

    const players = [
      createTestPlayer({ id: playerId, turn_order: 0 }),
      createTestPlayer({ id: '33333333-3333-4333-8333-333333333333', turn_order: 1 }),
    ];

    // Player 2 owns 12 territories -> should get 4 armies (12/3)
    const territories = Array.from({ length: 12 }, () =>
      createTestTerritory({ owner_id: '33333333-3333-4333-8333-333333333333' })
    );

    let playerUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: territories,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        playerUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await endTurn(gameId, playerId);

    expect(playerUpdate.armies_available).toBe(4); // 12 territories / 3
  });

  it('should set phase to reinforcement', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '22222222-2222-4222-8222-222222222222';

    const game = createTestGame({
      id: gameId,
      current_player_order: 0,
      phase: 'fortify', // Previous phase
    });

    const players = [
      createTestPlayer({ id: playerId, turn_order: 0 }),
      createTestPlayer({ id: '33333333-3333-4333-8333-333333333333', turn_order: 1 }),
    ];

    const territories = [createTestTerritory({ owner_id: '33333333-3333-4333-8333-333333333333' })];

    let gameUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: territories,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        gameUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    await endTurn(gameId, playerId);

    expect(gameUpdate.phase).toBe('reinforcement');
  });

  it('should handle only non-eliminated players in rotation', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const playerId = '22222222-2222-4222-8222-222222222222';

    const game = createTestGame({
      id: gameId,
      current_player_order: 0,
    });

    // Only non-eliminated players (sequential turn_order for this test)
    const players = [
      createTestPlayer({ id: playerId, turn_order: 0 }),
      createTestPlayer({ id: '33333333-3333-4333-8333-333333333333', turn_order: 1 }),
    ];

    const territories = [createTestTerritory({ owner_id: '33333333-3333-4333-8333-333333333333' })];

    let gameUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: game,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: territories,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        gameUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    await endTurn(gameId, playerId);

    expect(gameUpdate.current_player_order).toBe(1); // Next non-eliminated player
  });
});
