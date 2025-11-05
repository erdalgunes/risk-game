import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestPlayer } from '@/tests/factories/player';

// Mock Supabase server client
const mockSupabase = {
  from: vi.fn(),
};

const mockCreateServerClient = vi.fn(() => mockSupabase);

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: mockCreateServerClient,
}));

// Import after mocks are setup
const { startGame } = await import('../game');

describe('startGame Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start game with 2 players successfully', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const players = [
      createTestPlayer({ id: 'p1', turn_order: 0 }),
      createTestPlayer({ id: 'p2', turn_order: 1 }),
    ];

    // Mock players query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    // Mock territories insert
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock player updates (called for each player)
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock game update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const result = await startGame(gameId);

    expect(result.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('players');
    expect(mockSupabase.from).toHaveBeenCalledWith('territories');
    expect(mockSupabase.from).toHaveBeenCalledWith('games');
  });

  it('should fail with less than 2 players', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [createTestPlayer()], // Only 1 player
        error: null,
      }),
    });

    const result = await startGame(gameId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough players to start game');
  });

  it('should fail if players query returns error', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    });

    const result = await startGame(gameId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough players to start game');
  });

  it('should distribute all 42 territories among players', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const players = [
      createTestPlayer({ id: 'p1', turn_order: 0 }),
      createTestPlayer({ id: 'p2', turn_order: 1 }),
      createTestPlayer({ id: 'p3', turn_order: 2 }),
    ];

    let territoriesInserted: any[] = [];

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockImplementation((data) => {
        territoriesInserted = data;
        return Promise.resolve({ error: null });
      }),
    });

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await startGame(gameId);

    expect(territoriesInserted).toHaveLength(42); // Classic Risk has 42 territories
    territoriesInserted.forEach((t) => {
      expect(t.game_id).toBe(gameId);
      expect(t.army_count).toBe(1);
      expect(['p1', 'p2', 'p3']).toContain(t.owner_id);
    });
  });

  it('should calculate correct initial armies for different player counts', async () => {
    const testCases = [
      { playerCount: 2, expectedArmies: 40 },
      { playerCount: 3, expectedArmies: 35 },
      { playerCount: 4, expectedArmies: 30 },
    ];

    for (const { playerCount, expectedArmies } of testCases) {
      vi.clearAllMocks();

      const gameId = '11111111-1111-4111-8111-111111111111';
      const players = Array.from({ length: playerCount }, (_, i) =>
        createTestPlayer({ id: `p${i}`, turn_order: i })
      );

      let updatedArmies: number[] = [];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: players,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'players') {
          return {
            update: vi.fn().mockImplementation((data: any) => {
              updatedArmies.push(data.armies_available);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      await startGame(gameId);

      // Each player should get initial armies minus territories already placed
      const territoriesPerPlayer = Math.ceil(42 / playerCount);
      const expectedRemaining = expectedArmies - territoriesPerPlayer;

      updatedArmies.forEach((armies) => {
        expect(armies).toBe(expectedRemaining);
      });
    }
  });

  it('should set game status to setup', async () => {
    const gameId = '11111111-1111-4111-8111-111111111111';
    const players = [
      createTestPlayer({ id: 'p1', turn_order: 0 }),
      createTestPlayer({ id: 'p2', turn_order: 1 }),
    ];

    let gameUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: players,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'games') {
        return {
          update: vi.fn().mockImplementation((data: any) => {
            gameUpdate = data;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    await startGame(gameId);

    expect(gameUpdate).toMatchObject({
      status: 'setup',
      current_player_order: 0,
    });
  });
});
