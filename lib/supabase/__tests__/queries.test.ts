import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as queries from '../queries';
import { supabase } from '../client';
import { createTestGame, createTestPlayer, createTestTerritory } from '@/tests/factories';

// Mock the Supabase client
vi.mock('../client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock the monitoring module
vi.mock('@/lib/monitoring/performance', () => ({
  monitorQuery: vi.fn((name, table, fn) => fn()),
}));

// Helper to mock Supabase game query
const mockGameQuery = (data: any, error: any = null) => {
  vi.mocked(supabase.from).mockReturnValueOnce({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  } as any);
};

// Helper to mock Supabase players query
const mockPlayersQuery = (data: any, error: any = null) => {
  vi.mocked(supabase.from).mockReturnValueOnce({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  } as any);
};

// Helper to mock Supabase territories query
const mockTerritoriesQuery = (data: any, error: any = null) => {
  vi.mocked(supabase.from).mockReturnValueOnce({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error }),
  } as any);
};

describe('queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGameState', () => {
    it('should return game state when game exists', async () => {
      const mockGame = createTestGame();
      const mockPlayers = [createTestPlayer({ game_id: mockGame.id })];
      const mockTerritories = [createTestTerritory({ game_id: mockGame.id })];

      mockGameQuery(mockGame);
      mockPlayersQuery(mockPlayers);
      mockTerritoriesQuery(mockTerritories);

      const result = await queries.getGameState(mockGame.id);

      expect(result.game).toEqual(mockGame);
      expect(result.players).toEqual(mockPlayers);
      expect(result.territories).toEqual(mockTerritories);
    });

    it('should return null game when game does not exist (PGRST116)', async () => {
      const notFoundError = { code: 'PGRST116', message: 'No rows found' };

      mockGameQuery(null, notFoundError);
      mockPlayersQuery([]);
      mockTerritoriesQuery([]);

      const result = await queries.getGameState('11111111-1111-4111-8111-111111111111');

      expect(result.game).toBeNull();
      expect(result.players).toEqual([]);
      expect(result.territories).toEqual([]);
      expect(result.currentPlayer).toBeNull();
    });

    it('should throw error for network or other errors', async () => {
      const networkError = { code: 'NETWORK_ERROR', message: 'Failed to fetch' };

      mockGameQuery(null, networkError);
      mockPlayersQuery([]);
      mockTerritoriesQuery([]);

      await expect(queries.getGameState('11111111-1111-4111-8111-111111111111')).rejects.toEqual(networkError);
    });

    it('should throw error when players query fails', async () => {
      const mockGame = createTestGame();
      const playersError = { code: 'ERROR', message: 'Players query failed' };

      mockGameQuery(mockGame);
      mockPlayersQuery(null, playersError);
      mockTerritoriesQuery([]);

      await expect(queries.getGameState(mockGame.id)).rejects.toEqual(playersError);
    });

    it('should throw error when territories query fails', async () => {
      const mockGame = createTestGame();
      const mockPlayers = [createTestPlayer()];
      const territoriesError = { code: 'ERROR', message: 'Territories query failed' };

      mockGameQuery(mockGame);
      mockPlayersQuery(mockPlayers);
      mockTerritoriesQuery(null, territoriesError);

      await expect(queries.getGameState(mockGame.id)).rejects.toEqual(territoriesError);
    });
  });

  describe('createGame', () => {
    it('should create a game with default max_players', async () => {
      const mockGame = createTestGame();

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockGame, error: null }),
          }),
        }),
      } as any);

      const result = await queries.createGame();

      expect(result).toEqual(mockGame);
      expect(supabase.from).toHaveBeenCalledWith('games');
    });

    it('should throw error if creation fails', async () => {
      const error = { code: 'ERROR', message: 'Failed to create game' };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error }),
          }),
        }),
      } as any);

      await expect(queries.createGame()).rejects.toEqual(error);
    });
  });

  describe('joinGame', () => {
    it('should join a game as a player', async () => {
      const mockPlayer = createTestPlayer();
      const gameId = '11111111-1111-4111-8111-111111111111';
      const username = 'TestPlayer';
      const color = 'red';

      // Mock player count query
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 2 }),
      } as any);

      // Mock player insert
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPlayer, error: null }),
      } as any);

      const result = await queries.joinGame(gameId, username, color);

      expect(result).toEqual(mockPlayer);
    });

    it('should throw error if join fails', async () => {
      const error = { code: 'ERROR', message: 'Failed to join game' };

      // Mock player count query
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      } as any);

      // Mock player insert with error
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      } as any);

      await expect(queries.joinGame('11111111-1111-4111-8111-111111111111', 'Player', 'red')).rejects.toEqual(error);
    });
  });
});
