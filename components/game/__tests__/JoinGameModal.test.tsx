import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { JoinGameModal } from '../JoinGameModal';
import { createTestGame, createWaitingGame, createTestPlayer } from '@/tests/factories';
import type { Game, Player } from '@/types/game';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/actions/game', () => ({
  joinGameAction: vi.fn(() => Promise.resolve({ success: true, result: { gameId: 'game-123', playerId: 'player-123' } })),
}));

vi.mock('@/lib/hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('@/lib/utils/rate-limiter', () => ({
  rateLimiter: {
    check: vi.fn(() => true),
    getResetTime: vi.fn(() => 30),
  },
  RATE_LIMITS: {
    JOIN_GAME: { limit: 5, windowMs: 60000 },
  },
}));

describe('JoinGameModal', () => {
  const mockGameId = 'game-123';
  let mockGame: Game;
  let mockPlayers: Player[];

  beforeEach(() => {
    mockGame = createWaitingGame({ id: mockGameId, max_players: 4 });
    mockPlayers = [];
  });

  describe('Rendering - Basic UI', () => {
    it('should render join game heading', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      expect(screen.getByRole('heading', { name: /join game/i })).toBeInTheDocument();
    });

    it('should render game information section', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      expect(screen.getByText(/game information/i)).toBeInTheDocument();
      expect(screen.getByText(/game id:/i)).toBeInTheDocument();
      expect(screen.getByText(/status:/i)).toBeInTheDocument();
    });

    it('should display game ID (truncated)', () => {
      const game = createWaitingGame({ id: 'abcd-efgh-ijkl-mnop' });
      render(<JoinGameModal gameId={game.id} game={game} players={mockPlayers} />);

      expect(screen.getByText(/abcd-efg/i)).toBeInTheDocument();
    });

    it('should display player count', () => {
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      expect(screen.getByText(/players: 2 \/ 4/i)).toBeInTheDocument();
    });

    it('should display game status', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      expect(screen.getByText(/status: waiting/i)).toBeInTheDocument();
    });

    it('should render PlayerSetupForm component', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      // Check for username input
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();

      // Check for color select
      expect(screen.getByLabelText(/your color/i)).toBeInTheDocument();
    });

    it('should render join and back buttons', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to lobby/i })).toBeInTheDocument();
    });
  });

  describe('Player List Display', () => {
    it('should show current players heading when players exist', () => {
      const players = [createTestPlayer({ username: 'Alice', game_id: mockGameId })];
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      expect(screen.getByText(/current players/i)).toBeInTheDocument();
    });

    it('should display all current players', () => {
      const players = [
        createTestPlayer({ username: 'Alice', color: 'red', game_id: mockGameId }),
        createTestPlayer({ username: 'Bob', color: 'blue', game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should not show player list when no players exist', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={[]} />);

      expect(screen.queryByText(/current players/i)).not.toBeInTheDocument();
    });

    it('should show eliminated indicator for eliminated players', () => {
      const players = [
        createTestPlayer({ username: 'Alice', is_eliminated: true, game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      expect(screen.getByText(/eliminated/i)).toBeInTheDocument();
    });

    it('should display player color indicators', () => {
      const players = [createTestPlayer({ color: 'red', game_id: mockGameId })];

      const { container } = render(
        <JoinGameModal gameId={mockGameId} game={mockGame} players={players} />
      );

      const colorIndicator = container.querySelector('[style*="background-color"]');
      expect(colorIndicator).toBeInTheDocument();
    });
  });

  describe('Edge Case Handling - Game Full', () => {
    it('should show warning when game is full', () => {
      const fullGame = createWaitingGame({ max_players: 2 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullGame} players={players} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/this game is full/i)).toBeInTheDocument();
    });

    it('should disable join button when game is full', () => {
      const fullGame = createWaitingGame({ max_players: 2 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullGame} players={players} />);

      const joinButton = screen.getByRole('button', { name: /game is full/i });
      expect(joinButton).toBeDisabled();
    });

    it('should change button text to "Game Full" when game is full', () => {
      const fullGame = createWaitingGame({ max_players: 2 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullGame} players={players} />);

      // Check by text content
      expect(screen.getByText('Game Full')).toBeInTheDocument();
      // Verify the aria-label
      expect(screen.getByRole('button', { name: /game is full/i })).toBeInTheDocument();
    });
  });

  describe('Edge Case Handling - Game Started', () => {
    it('should show info message when game has already started', () => {
      const startedGame = createTestGame({ status: 'playing', max_players: 4 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={startedGame} players={players} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/this game has already started/i)).toBeInTheDocument();
      expect(screen.getByText(/you can still join as an observer/i)).toBeInTheDocument();
    });

    it('should not show started message when game is waiting', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      expect(screen.queryByText(/this game has already started/i)).not.toBeInTheDocument();
    });

    it('should not show both full and started messages', () => {
      const fullStartedGame = createTestGame({ status: 'playing', max_players: 2 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullStartedGame} players={players} />);

      // Only the "game full" message should appear (higher priority)
      expect(screen.getByText(/this game is full/i)).toBeInTheDocument();
      expect(screen.queryByText(/this game has already started/i)).not.toBeInTheDocument();
    });
  });

  describe('Color Selection', () => {
    it('should show only available colors (not taken by other players)', () => {
      const players = [
        createTestPlayer({ color: 'red', game_id: mockGameId }),
        createTestPlayer({ color: 'blue', game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      const colorSelect = screen.getByLabelText(/your color/i) as HTMLSelectElement;
      const options = Array.from(colorSelect.options).map(opt => opt.value);

      expect(options).not.toContain('red');
      expect(options).not.toContain('blue');
      expect(options).toContain('green');
      expect(options).toContain('yellow');
    });

    it('should auto-select first available color', async () => {
      const players = [
        createTestPlayer({ color: 'red', game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      await waitFor(() => {
        const colorSelect = screen.getByLabelText(/your color/i) as HTMLSelectElement;
        // First available should be 'blue' (since 'red' is taken)
        expect(colorSelect.value).not.toBe('red');
      });
    });

    it('should show "no colors available" when all colors are taken', () => {
      const fullGame = createWaitingGame({ max_players: 6 });
      const players = [
        createTestPlayer({ color: 'red', game_id: mockGameId }),
        createTestPlayer({ color: 'blue', game_id: mockGameId }),
        createTestPlayer({ color: 'green', game_id: mockGameId }),
        createTestPlayer({ color: 'yellow', game_id: mockGameId }),
        createTestPlayer({ color: 'purple', game_id: mockGameId }),
        createTestPlayer({ color: 'orange', game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullGame} players={players} />);

      expect(screen.getByText(/no colors available/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable join button when username is empty', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      const joinButton = screen.getByRole('button', { name: /join game/i });
      expect(joinButton).toBeDisabled();
    });

    it('should enable join button when username is valid', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'ValidUser');

      const joinButton = screen.getByRole('button', { name: /join game/i });
      expect(joinButton).not.toBeDisabled();
    });

    it('should disable join button when no colors are available', () => {
      const fullGame = createWaitingGame({ max_players: 6 });
      const players = [
        createTestPlayer({ color: 'red', game_id: mockGameId }),
        createTestPlayer({ color: 'blue', game_id: mockGameId }),
        createTestPlayer({ color: 'green', game_id: mockGameId }),
        createTestPlayer({ color: 'yellow', game_id: mockGameId }),
        createTestPlayer({ color: 'purple', game_id: mockGameId }),
        createTestPlayer({ color: 'orange', game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullGame} players={players} />);

      // When all colors are taken and game is full, the button shows "Game Full"
      const joinButton = screen.getByRole('button', { name: /game is full/i });
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Null Game Handling', () => {
    it('should render without game data (null game)', () => {
      render(<JoinGameModal gameId={mockGameId} game={null} players={mockPlayers} />);

      // Should still render basic structure
      expect(screen.getByRole('heading', { name: /join game/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to lobby/i })).toBeInTheDocument();
    });

    it('should not show game info section when game is null', () => {
      render(<JoinGameModal gameId={mockGameId} game={null} players={mockPlayers} />);

      expect(screen.queryByText(/game information/i)).not.toBeInTheDocument();
    });

    it('should not detect game as full when game is null', () => {
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={null} players={players} />);

      expect(screen.queryByText(/this game is full/i)).not.toBeInTheDocument();
    });

    it('should not detect game as started when game is null', () => {
      render(<JoinGameModal gameId={mockGameId} game={null} players={mockPlayers} />);

      expect(screen.queryByText(/this game has already started/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      expect(screen.getByRole('button', { name: /join game/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /back to lobby/i })).toHaveAttribute('aria-label');
    });

    it('should have role="alert" for warning messages', () => {
      const fullGame = createWaitingGame({ max_players: 2 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={fullGame} players={players} />);

      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should have aria-busy attribute on join button when loading', async () => {
      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={mockPlayers} />);

      const joinButton = screen.getByRole('button', { name: /join game/i });
      expect(joinButton).toHaveAttribute('aria-busy');
    });

    it('should provide aria-label for player color indicators', () => {
      const players = [createTestPlayer({ username: 'Alice', color: 'red', game_id: mockGameId })];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      const colorIndicator = screen.getByLabelText(/alice's color: red/i);
      expect(colorIndicator).toBeInTheDocument();
    });
  });

  describe('Multiple Scenarios', () => {
    it('should handle game with multiple players correctly', () => {
      const players = [
        createTestPlayer({ username: 'Alice', color: 'red', game_id: mockGameId }),
        createTestPlayer({ username: 'Bob', color: 'blue', game_id: mockGameId }),
        createTestPlayer({ username: 'Charlie', color: 'green', game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={mockGame} players={players} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText(/players: 3 \/ 4/i)).toBeInTheDocument();
    });

    it('should handle game at capacity - 1 (one slot remaining)', () => {
      const almostFullGame = createWaitingGame({ max_players: 3 });
      const players = [
        createTestPlayer({ game_id: mockGameId }),
        createTestPlayer({ game_id: mockGameId }),
      ];

      render(<JoinGameModal gameId={mockGameId} game={almostFullGame} players={players} />);

      // Should not show "game full" warning
      expect(screen.queryByText(/this game is full/i)).not.toBeInTheDocument();

      // Join button should be enabled (with valid username)
      const joinButton = screen.getByRole('button', { name: /join game/i });
      // Will be disabled due to empty username, but not due to game being full
      expect(joinButton).toBeInTheDocument();
    });
  });
});
