import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Import after mocks are setup
const { placeArmies } = await import('../game');

describe('placeArmies Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should place armies successfully', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 3;

    const player = createTestPlayer({ id: playerId, armies_available: 5 });
    const territory = createTestTerritory({
      id: territoryId,
      owner_id: playerId,
      army_count: 2,
    });

    // Mock player query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: player,
        error: null,
      }),
    });

    // Mock territory query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: territory,
        error: null,
      }),
    });

    // Mock territory update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock player update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock game status check
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: 'playing' },
        error: null,
      }),
    });

    const result = await placeArmies(gameId, playerId, territoryId, count);

    expect(result.success).toBe(true);
  });

  it('should fail if player not found', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 3;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    });

    const result = await placeArmies(gameId, playerId, territoryId, count);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Player not found');
  });

  it('should fail if not enough armies available', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 10;

    const player = createTestPlayer({ id: playerId, armies_available: 5 });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: player,
        error: null,
      }),
    });

    const result = await placeArmies(gameId, playerId, territoryId, count);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough armies available');
  });

  it('should fail if player does not own territory', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 3;

    const player = createTestPlayer({ id: playerId, armies_available: 5 });
    const territory = createTestTerritory({
      id: territoryId,
      owner_id: 'other-player',
      army_count: 2,
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: player,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: territory,
        error: null,
      }),
    });

    const result = await placeArmies(gameId, playerId, territoryId, count);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You do not own this territory');
  });

  it('should update territory army count correctly', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 3;

    const player = createTestPlayer({ id: playerId, armies_available: 5 });
    const territory = createTestTerritory({
      id: territoryId,
      owner_id: playerId,
      army_count: 2,
    });

    let territoryUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: player,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: territory,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        territoryUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: 'playing' },
        error: null,
      }),
    });

    await placeArmies(gameId, playerId, territoryId, count);

    expect(territoryUpdate.army_count).toBe(5); // 2 + 3
  });

  it('should update player available armies correctly', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 3;

    const player = createTestPlayer({ id: playerId, armies_available: 5 });
    const territory = createTestTerritory({
      id: territoryId,
      owner_id: playerId,
      army_count: 2,
    });

    let playerUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: player,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: territory,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
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
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: 'playing' },
        error: null,
      }),
    });

    await placeArmies(gameId, playerId, territoryId, count);

    expect(playerUpdate.armies_available).toBe(2); // 5 - 3
  });

  it('should transition from setup to playing when all armies placed', async () => {
    const gameId = '11111111-1111-1111-1111-111111111111';
    const playerId = '22222222-2222-2222-2222-222222222222';
    const territoryId = '44444444-4444-4444-4444-444444444444';
    const count = 5; // Last armies

    const player = createTestPlayer({ id: playerId, armies_available: 5 });
    const territory = createTestTerritory({
      id: territoryId,
      owner_id: playerId,
      army_count: 2,
    });

    let gameStatusUpdate: any = null;

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: player,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: territory,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock game status check - setup phase
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: 'setup' },
        error: null,
      }),
    });

    // Mock all players check - all have 0 armies
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { armies_available: 0 },
          { armies_available: 0 },
        ],
        error: null,
      }),
    });

    // Mock game status update to playing
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockImplementation((data: any) => {
        gameStatusUpdate = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    await placeArmies(gameId, playerId, territoryId, count);

    expect(gameStatusUpdate).toMatchObject({
      status: 'playing',
      phase: 'reinforcement',
    });
  });
});
