import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameBoard } from '../GameBoard';
import {
  createTestGame,
  createTestPlayer,
  createTestPlayers,
  createTestTerritory,
} from '@/tests/factories';
import * as useGameState from '@/lib/hooks/useGameState';
import * as gameActions from '@/app/actions/game';
import { ToastProvider } from '@/components/Toast';

// Mock the useGameState hook
vi.mock('@/lib/hooks/useGameState', () => ({
  useGameState: vi.fn(),
}));

// Mock game actions
vi.mock('@/app/actions/game', () => ({
  startGame: vi.fn(),
  placeArmies: vi.fn(),
  attackTerritory: vi.fn(),
  fortifyTerritory: vi.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('GameBoard', () => {
  const mockGameId = 'game-123';
  const mockPlayerId = 'player-456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gameActions.startGame).mockResolvedValue({ success: true });
    vi.mocked(gameActions.placeArmies).mockResolvedValue({ success: true });
    vi.mocked(gameActions.attackTerritory).mockResolvedValue({
      success: true,
      result: {
        success: true,
        attackerDice: [6],
        defenderDice: [1],
        attackerLosses: 0,
        defenderLosses: 1,
        conquered: true,
      },
    });
    vi.mocked(gameActions.fortifyTerritory).mockResolvedValue({ success: true });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      vi.mocked(useGameState.useGameState).mockReturnValue({
        game: null,
        players: [],
        territories: [],
        currentPlayer: null,
        loading: true,
        error: null,
        connectionStatus: 'disconnected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText(/loading game/i)).toBeInTheDocument();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      vi.mocked(useGameState.useGameState).mockReturnValue({
        game: null,
        players: [],
        territories: [],
        currentPlayer: null,
        loading: false,
        error: new Error('Failed to load game'),
        connectionStatus: 'disconnected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText(/error loading game/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load game/i)).toBeInTheDocument();
    });

    it('should show game not found when game is null', () => {
      vi.mocked(useGameState.useGameState).mockReturnValue({
        game: null,
        players: [],
        territories: [],
        currentPlayer: null,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText(/game not found/i)).toBeInTheDocument();
    });
  });

  describe('Victory Screen', () => {
    it('should show victory screen when game is finished', () => {
      const winner = createTestPlayer({ id: 'winner-id', username: 'Winner' });
      const game = createTestGame({ status: 'finished', winner_id: 'winner-id' });
      const territories = [
        createTestTerritory({ owner_id: 'winner-id', army_count: 5 }),
        createTestTerritory({ owner_id: 'winner-id', army_count: 3 }),
      ];

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [winner],
        territories,
        currentPlayer: winner,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByRole('heading', { name: /victory!/i })).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('should show winner username and statistics', () => {
      const winner = createTestPlayer({ id: 'winner-id', username: 'Champion', color: 'red' });
      const game = createTestGame({ status: 'finished', winner_id: 'winner-id', current_turn: 50 });
      const territories = [
        createTestTerritory({ owner_id: 'winner-id', army_count: 10 }),
        createTestTerritory({ owner_id: 'winner-id', army_count: 15 }),
      ];

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [winner],
        territories,
        currentPlayer: winner,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText('Champion')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument(); // Turn count
      expect(screen.getByText('2/42')).toBeInTheDocument(); // Territories
      expect(screen.getByText('25')).toBeInTheDocument(); // Total armies
    });

    it('should have return to lobby link', () => {
      const winner = createTestPlayer({ id: 'winner-id' });
      const game = createTestGame({ status: 'finished', winner_id: 'winner-id' });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [winner],
        territories: [],
        currentPlayer: winner,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      const lobbyLink = screen.getByRole('link', { name: /return to lobby/i });
      expect(lobbyLink).toHaveAttribute('href', '/');
    });
  });

  describe('Waiting Status', () => {
    it('should show start game button when status is waiting', () => {
      const players = createTestPlayers(mockGameId, 2);
      const game = createTestGame({ status: 'waiting', max_players: 4 });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByRole('heading', { name: /waiting for players/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
    });

    it('should show player count', () => {
      const players = createTestPlayers(mockGameId, 3);
      const game = createTestGame({ status: 'waiting', max_players: 6 });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText(/3 \/ 6 players joined/i)).toBeInTheDocument();
    });

    it('should disable start button when less than 2 players', () => {
      const players = [createTestPlayer()];
      const game = createTestGame({ status: 'waiting' });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      expect(startButton).toBeDisabled();
      expect(screen.getByText(/need at least 2 players to start/i)).toBeInTheDocument();
    });

    it('should call startGame when start button is clicked', async () => {
      const user = userEvent.setup();
      const players = createTestPlayers(mockGameId, 2);
      const game = createTestGame({ status: 'waiting' });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(gameActions.startGame).toHaveBeenCalledWith(mockGameId);
      });
    });

    it('should show toast notification when start game fails', async () => {
      const user = userEvent.setup();
      vi.mocked(gameActions.startGame).mockResolvedValue({
        success: false,
        error: 'Not enough players',
      });

      const players = createTestPlayers(mockGameId, 2);
      const game = createTestGame({ status: 'waiting' });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/not enough players/i)).toBeInTheDocument();
      });
    });
  });

  describe('Game Header', () => {
    it('should show game title and ID', () => {
      const game = createTestGame({ id: mockGameId, status: 'playing' });
      const players = createTestPlayers(mockGameId, 2);

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByRole('heading', { name: /risk game/i })).toBeInTheDocument();
      expect(screen.getByText(/game id:/i)).toBeInTheDocument();
    });

    it('should show game status and phase', () => {
      const game = createTestGame({ status: 'playing', phase: 'attack' });
      const players = createTestPlayers(mockGameId, 2);

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText(/status/i)).toBeInTheDocument();
      expect(screen.getByText(/playing/i)).toBeInTheDocument();
      expect(screen.getByText(/phase: attack/i)).toBeInTheDocument();
    });
  });

  describe('Current Turn Display', () => {
    it('should show current player turn', () => {
      const players = createTestPlayers(mockGameId, 2);
      const game = createTestGame({ status: 'playing', current_player_order: 0, current_turn: 5 });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByText(/current turn/i)).toBeInTheDocument();
      expect(screen.getByText(/turn #6/i)).toBeInTheDocument();
    });

    it('should highlight when it is your turn', () => {
      const players = createTestPlayers(mockGameId, 2);
      const currentPlayerData = { ...players[0], id: mockPlayerId };
      const game = createTestGame({ status: 'playing', current_player_order: 0 });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [currentPlayerData, players[1]],
        territories: [],
        currentPlayer: currentPlayerData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      const yourTurnElements = screen.getAllByText(/your turn/i);
      expect(yourTurnElements.length).toBeGreaterThan(0);
    });
  });

  describe('Player Info Sidebar', () => {
    it('should show your player info', () => {
      const players = createTestPlayers(mockGameId, 2);
      const yourPlayer = {
        ...players[0],
        id: mockPlayerId,
        username: 'You',
        armies_available: 10,
        color: 'red' as const,
      };
      const game = createTestGame({ status: 'playing' });
      const territories = [
        createTestTerritory({ owner_id: mockPlayerId }),
        createTestTerritory({ owner_id: mockPlayerId }),
        createTestTerritory({ owner_id: 'other-player' }),
      ];

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [yourPlayer, players[1]],
        territories,
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByRole('heading', { name: /your info/i })).toBeInTheDocument();
      expect(screen.getByText(/armies available:/i)).toBeInTheDocument();
      // Verify territory count is shown
      const territoryElements = screen.getAllByText(/territories:/i);
      expect(territoryElements.length).toBeGreaterThan(0);
    });
  });

  describe('Army Placement Modal', () => {
    it('should not show modal initially', () => {
      const game = createTestGame({ status: 'setup', current_player_order: 0 });
      const players = createTestPlayers(mockGameId, 2);
      const currentPlayerData = { ...players[0], id: mockPlayerId, turn_order: 0 };

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [currentPlayerData],
        territories: [],
        currentPlayer: currentPlayerData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.queryByRole('heading', { name: /place armies/i })).not.toBeInTheDocument();
    });

    it.skip('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      const game = createTestGame({ status: 'setup', current_player_order: 0 });
      const players = createTestPlayers(mockGameId, 2);
      const currentPlayerData = {
        ...players[0],
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 10,
      };
      const territory = createTestTerritory({
        id: 'territory-1',
        territory_name: 'alaska',
        owner_id: mockPlayerId,
      });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [currentPlayerData],
        territories: [territory],
        currentPlayer: currentPlayerData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      // Click territory to open modal
      const territoryElement = screen.getByText(/alaska/i);
      await user.click(territoryElement);

      // Modal should be open
      expect(screen.getByRole('heading', { name: /place armies/i })).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /place armies/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('GameControls Integration', () => {
    it('should render GameControls component', () => {
      const game = createTestGame({ status: 'playing', phase: 'attack', current_player_order: 0 });
      const players = createTestPlayers(mockGameId, 2);
      const currentPlayerData = { ...players[0], id: mockPlayerId, turn_order: 0 };

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [currentPlayerData],
        territories: [],
        currentPlayer: currentPlayerData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      // GameControls renders attack phase controls
      expect(screen.getByText(/attack enemy territories/i)).toBeInTheDocument();
    });
  });

  describe('PlayersList Integration', () => {
    it('should render PlayersList component', () => {
      const game = createTestGame({ status: 'playing' });
      const players = createTestPlayers(mockGameId, 3);

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories: [],
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByRole('heading', { name: /players/i })).toBeInTheDocument();
    });
  });

  describe('TerritoriesList Integration', () => {
    it('should render TerritoriesList component', () => {
      const game = createTestGame({ status: 'playing' });
      const players = createTestPlayers(mockGameId, 2);
      const territories = [
        createTestTerritory({ territory_name: 'alaska', owner_id: mockPlayerId }),
      ];

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players,
        territories,
        currentPlayer: players[0],
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      expect(screen.getByRole('heading', { name: /territories/i })).toBeInTheDocument();
      expect(screen.getByText(/alaska/i)).toBeInTheDocument();
    });
  });

  describe('Attack Modal', () => {
    it.skip('should show attack modal during attack phase when territories selected', async () => {
      const user = userEvent.setup();
      const game = createTestGame({ status: 'playing', phase: 'attack', current_player_order: 0 });
      const players = createTestPlayers(mockGameId, 2);
      const currentPlayerData = { ...players[0], id: mockPlayerId, turn_order: 0 };
      const yourTerritory = createTestTerritory({
        territory_name: 'alaska',
        owner_id: mockPlayerId,
        army_count: 5,
      });
      const enemyTerritory = createTestTerritory({
        territory_name: 'alberta',
        owner_id: 'enemy-id',
        army_count: 2,
      });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [currentPlayerData, players[1]],
        territories: [yourTerritory, enemyTerritory],
        currentPlayer: currentPlayerData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      // Click your territory (with 2+ armies)
      const alaskaTerritory = screen.getByText(/alaska/i);
      await user.click(alaskaTerritory);

      // Attack modal should show with "From" selected
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /attack/i })).toBeInTheDocument();
      });
    });
  });

  describe('Fortify Modal', () => {
    it.skip('should show fortify modal during fortify phase when territories selected', async () => {
      const user = userEvent.setup();
      const game = createTestGame({ status: 'playing', phase: 'fortify', current_player_order: 0 });
      const players = createTestPlayers(mockGameId, 2);
      const currentPlayerData = { ...players[0], id: mockPlayerId, turn_order: 0 };
      const territory1 = createTestTerritory({
        territory_name: 'alaska',
        owner_id: mockPlayerId,
        army_count: 5,
      });
      const territory2 = createTestTerritory({
        territory_name: 'alberta',
        owner_id: mockPlayerId,
        army_count: 2,
      });

      vi.mocked(useGameState.useGameState).mockReturnValue({
        game,
        players: [currentPlayerData, players[1]],
        territories: [territory1, territory2],
        currentPlayer: currentPlayerData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
      });

      renderWithProviders(<GameBoard gameId={mockGameId} playerId={mockPlayerId} />);

      // Click first territory
      const alaskaTerritory = screen.getByText(/alaska/i);
      await user.click(alaskaTerritory);

      // Fortify modal should show
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /fortify/i })).toBeInTheDocument();
      });
    });
  });
});
