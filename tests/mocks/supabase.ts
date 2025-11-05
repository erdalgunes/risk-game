import { vi } from 'vitest';

/**
 * Mock Supabase client for unit tests
 * Use this when you don't need a real database connection
 */

export const createMockSupabaseClient = () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    unsubscribe: vi.fn(),
  };

  const mockFrom = vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));

  const mockRpc = vi.fn((functionName: string, params?: any) => {
    // Default RPC responses based on function name
    switch (functionName) {
      case 'place_armies_transaction':
        return Promise.resolve({
          data: {
            success: true,
            territory_armies: (params?.p_count || 1) + 1, // Simulate adding armies
            player_armies_remaining: Math.max(0, 10 - (params?.p_count || 1)),
            game_status: 'setup',
          },
          error: null,
        });

      case 'check_and_transition_from_setup':
        return Promise.resolve({
          data: {
            success: true,
            transitioned: false,
            new_status: 'setup',
            reason: 'Players still have armies to place',
          },
          error: null,
        });

      case 'attack_territory_transaction':
        return Promise.resolve({
          data: {
            success: true,
            conquered: false,
            defender_eliminated: false,
            game_finished: false,
          },
          error: null,
        });

      default:
        return Promise.resolve({ data: { success: true }, error: null });
    }
  });

  return {
    from: mockFrom,
    rpc: mockRpc,
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
};

/**
 * Mock useGameState hook for component tests
 */
export const createMockGameState = (overrides = {}) => ({
  game: null,
  players: [],
  territories: [],
  currentPlayer: null,
  loading: false,
  error: null,
  ...overrides,
});

/**
 * Helper to mock Supabase module
 * Use in test files like:
 * vi.mock('@/lib/supabase/client', () => ({
 *   supabase: createMockSupabaseClient()
 * }))
 */
export const mockSupabaseModule = () => {
  const client = createMockSupabaseClient();
  return {
    supabase: client,
    createServerClient: vi.fn(() => client),
  };
};
