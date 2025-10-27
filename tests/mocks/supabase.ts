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

  return {
    from: mockFrom,
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
