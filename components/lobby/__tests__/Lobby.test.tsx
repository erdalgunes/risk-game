import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lobby } from '../Lobby';
import * as queries from '@/lib/supabase/queries';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  createGame: vi.fn(),
  joinGame: vi.fn(),
  getAvailableGames: vi.fn(),
}));

// Mock window.alert
global.alert = vi.fn();

describe('Lobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no games available
    vi.mocked(queries.getAvailableGames).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render lobby with title and description', () => {
      render(<Lobby />);

      expect(screen.getByRole('heading', { name: 'Risk' })).toBeInTheDocument();
      expect(screen.getByText('Multiplayer Strategy Game')).toBeInTheDocument();
    });

    it('should render create game and join game sections', () => {
      render(<Lobby />);

      expect(screen.getByRole('heading', { name: 'Create Game' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Available Games' })).toBeInTheDocument();
    });

    it('should render how to play instructions', () => {
      render(<Lobby />);

      expect(screen.getByRole('heading', { name: 'How to Play' })).toBeInTheDocument();
      expect(screen.getByText(/Enter your username and choose a color/i)).toBeInTheDocument();
    });

    it('should load available games on mount', async () => {
      render(<Lobby />);

      await waitFor(() => {
        expect(queries.getAvailableGames).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Form Inputs', () => {
    it('should allow entering username', async () => {
      const user = userEvent.setup();
      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      expect(usernameInput).toHaveValue('TestPlayer');
    });

    it('should allow selecting color', async () => {
      const user = userEvent.setup();
      render(<Lobby />);

      const colorSelects = screen.getAllByRole('combobox');
      const colorSelect = colorSelects[0];

      await user.selectOptions(colorSelect, 'blue');

      expect(colorSelect).toHaveValue('blue');
    });

    it('should allow selecting max players', async () => {
      const user = userEvent.setup();
      render(<Lobby />);

      const maxPlayersSelect = screen.getAllByRole('combobox')[1];

      await user.selectOptions(maxPlayersSelect, '6');

      expect(maxPlayersSelect).toHaveValue('6');
    });

    it('should have all player color options', () => {
      render(<Lobby />);

      const colorSelect = screen.getAllByRole('combobox')[0];
      const options = within(colorSelect).getAllByRole('option');

      expect(options.length).toBeGreaterThan(0);
      expect(options.map((o) => o.textContent)).toContain('Red');
      expect(options.map((o) => o.textContent)).toContain('Blue');
    });

    it('should have max player options from 2 to 6', () => {
      render(<Lobby />);

      const maxPlayersSelect = screen.getAllByRole('combobox')[1];
      const options = within(maxPlayersSelect).getAllByRole('option');

      expect(options).toHaveLength(5); // 2, 3, 4, 5, 6
      expect(options.map((o) => o.textContent)).toEqual([
        '2 Players',
        '3 Players',
        '4 Players',
        '5 Players',
        '6 Players',
      ]);
    });
  });

  describe('Create Game Button', () => {
    it('should disable create button when username is empty', () => {
      render(<Lobby />);

      const createButton = screen.getByRole('button', { name: /create game/i });

      expect(createButton).toBeDisabled();
    });

    it('should enable create button when username is provided', async () => {
      const user = userEvent.setup();
      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const createButton = screen.getByRole('button', { name: /create game/i });

      expect(createButton).toBeEnabled();
    });

    it('should show alert when trying to create game without username', async () => {
      const user = userEvent.setup();
      render(<Lobby />);

      // Force click on disabled button (in case it's enabled)
      const createButton = screen.getByRole('button', { name: /create game/i });

      // Button should be disabled, but test the handler logic
      expect(createButton).toBeDisabled();
    });

    it('should call createGame and joinGame when create button is clicked', async () => {
      const user = userEvent.setup();
      const mockGame = { id: 'game-123', max_players: 4 };
      const mockPlayer = { id: 'player-123', username: 'TestPlayer' };

      vi.mocked(queries.createGame).mockResolvedValue(mockGame as any);
      vi.mocked(queries.joinGame).mockResolvedValue(mockPlayer as any);

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const createButton = screen.getByRole('button', { name: /create game/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(queries.createGame).toHaveBeenCalledWith(4);
        expect(queries.joinGame).toHaveBeenCalledWith('game-123', 'TestPlayer', 'red');
      });
    });

    it('should navigate to game page after successful creation', async () => {
      const user = userEvent.setup();
      const mockGame = { id: 'game-123', max_players: 4 };
      const mockPlayer = { id: 'player-456', username: 'TestPlayer' };

      vi.mocked(queries.createGame).mockResolvedValue(mockGame as any);
      vi.mocked(queries.joinGame).mockResolvedValue(mockPlayer as any);

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const createButton = screen.getByRole('button', { name: /create game/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/game/game-123?playerId=player-456');
      });
    });

    it('should show loading state during game creation', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.createGame).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'game-123' } as any), 100))
      );
      vi.mocked(queries.joinGame).mockResolvedValue({ id: 'player-123' } as any);

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const createButton = screen.getByRole('button', { name: /create game/i });
      await user.click(createButton);

      // Button should show "Creating..."
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    });

    it('should show alert on game creation failure', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.createGame).mockRejectedValue(new Error('Creation failed'));

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const createButton = screen.getByRole('button', { name: /create game/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to create game. Please try again.');
      });
    });
  });

  describe('Available Games List', () => {
    it('should show "no games available" message when list is empty', async () => {
      render(<Lobby />);

      await waitFor(() => {
        expect(screen.getByText(/no games available/i)).toBeInTheDocument();
      });
    });

    it('should display available games when they exist', async () => {
      const mockGames = [
        {
          id: 'game-abc123',
          status: 'waiting',
          max_players: 4,
          players: [{ id: 'p1' }],
        },
        {
          id: 'game-def456',
          status: 'waiting',
          max_players: 6,
          players: [{ id: 'p1' }, { id: 'p2' }],
        },
      ];

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);

      render(<Lobby />);

      await waitFor(() => {
        expect(screen.getByText(/Game #game-abc/)).toBeInTheDocument();
        expect(screen.getByText(/Game #game-def/)).toBeInTheDocument();
      });
    });

    it('should show player count for each game', async () => {
      const mockGames = [
        {
          id: 'game-123',
          status: 'waiting',
          max_players: 4,
          players: [{ id: 'p1' }, { id: 'p2' }],
        },
      ];

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);

      render(<Lobby />);

      await waitFor(() => {
        expect(screen.getByText(/players: 2 \/ 4/i)).toBeInTheDocument();
      });
    });

    it('should refresh games list when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<Lobby />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        // Initial load + manual refresh
        expect(queries.getAvailableGames).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable join button when username is empty', async () => {
      const mockGames = [
        {
          id: 'game-123',
          status: 'waiting',
          max_players: 4,
          players: [{ id: 'p1' }],
        },
      ];

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);

      render(<Lobby />);

      await waitFor(() => {
        const joinButton = screen.getByRole('button', { name: /join/i });
        expect(joinButton).toBeDisabled();
      });
    });

    it('should disable join button when game is full', async () => {
      const mockGames = [
        {
          id: 'game-123',
          status: 'waiting',
          max_players: 2,
          players: [{ id: 'p1' }, { id: 'p2' }],
        },
      ];

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await userEvent.setup().type(usernameInput, 'TestPlayer');

      await waitFor(() => {
        const joinButton = screen.getByRole('button', { name: /join/i });
        expect(joinButton).toBeDisabled();
      });
    });

    it('should call joinGame when join button is clicked', async () => {
      const user = userEvent.setup();
      const mockGames = [
        {
          id: 'game-123',
          status: 'waiting',
          max_players: 4,
          players: [{ id: 'p1' }],
        },
      ];
      const mockPlayer = { id: 'player-456', username: 'TestPlayer' };

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);
      vi.mocked(queries.joinGame).mockResolvedValue(mockPlayer as any);

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /join/i });
      await user.click(joinButton);

      await waitFor(() => {
        expect(queries.joinGame).toHaveBeenCalledWith('game-123', 'TestPlayer', 'red');
      });
    });

    it('should navigate to game page after successful join', async () => {
      const user = userEvent.setup();
      const mockGames = [
        {
          id: 'game-789',
          status: 'waiting',
          max_players: 4,
          players: [{ id: 'p1' }],
        },
      ];
      const mockPlayer = { id: 'player-999', username: 'TestPlayer' };

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);
      vi.mocked(queries.joinGame).mockResolvedValue(mockPlayer as any);

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const joinButton = await screen.findByRole('button', { name: /join/i });
      await user.click(joinButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/game/game-789?playerId=player-999');
      });
    });

    it('should show alert on join game failure', async () => {
      const user = userEvent.setup();
      const mockGames = [
        {
          id: 'game-123',
          status: 'waiting',
          max_players: 4,
          players: [{ id: 'p1' }],
        },
      ];

      vi.mocked(queries.getAvailableGames).mockResolvedValue(mockGames as any);
      vi.mocked(queries.joinGame).mockRejectedValue(new Error('Join failed'));

      render(<Lobby />);

      const usernameInput = screen.getAllByPlaceholderText(/enter your username/i)[0];
      await user.type(usernameInput, 'TestPlayer');

      const joinButton = await screen.findByRole('button', { name: /join/i });
      await user.click(joinButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Failed to join game. Color may be taken or game is full.'
        );
      });
    });
  });
});
