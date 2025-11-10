import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SinglePlayerLobby } from '../SinglePlayerLobby';
import { createGameAction, joinGameAction, startGame } from '@/app/actions/game';
import { validateUsername } from '@/lib/validation/username';
import { mockSuccessfulGameCreation, mockFailedGameCreation, mockFailedGameStart, mockRouter, mockToast } from './test-helpers';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    addToast: vi.fn(),
    toasts: [],
    removeToast: vi.fn(),
    clearAll: vi.fn(),
  })),
}));

vi.mock('@/app/actions/game', () => ({
  createGameAction: vi.fn(),
  joinGameAction: vi.fn(),
  startGame: vi.fn(),
}));

vi.mock('@/lib/validation/username');

describe('SinglePlayerLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for validateUsername
    vi.mocked(validateUsername).mockReturnValue({ isValid: true });
  });

  describe('Initial Rendering', () => {
    it('should render single player lobby with title', () => {
      render(<SinglePlayerLobby />);
      expect(screen.getByText('Risk')).toBeInTheDocument();
      expect(screen.getByText('Single Player Practice Mode')).toBeInTheDocument();
    });

    it('should render form with all inputs', () => {
      render(<SinglePlayerLobby />);
      expect(screen.getByLabelText('Your Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Select your player color')).toBeInTheDocument();
      expect(screen.getByLabelText('Select number of AI opponents')).toBeInTheDocument();
    });

    it('should render start button', () => {
      render(<SinglePlayerLobby />);
      expect(screen.getByRole('button', { name: /start practice game/i })).toBeInTheDocument();
    });

    it('should render practice mode instructions', () => {
      render(<SinglePlayerLobby />);
      expect(screen.getByText('Practice Mode')).toBeInTheDocument();
      expect(
        screen.getByText(/Practice mode lets you play against AI opponents/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Inputs', () => {
    it('should update username on input change', () => {
      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'TestPlayer' } });

      expect(input.value).toBe('TestPlayer');
    });

    it('should validate username on change', () => {
      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');

      fireEvent.change(input, { target: { value: 'Test' } });

      expect(validateUsername).toHaveBeenCalledWith('Test');
    });

    it('should show validation error for invalid username', () => {
      vi.mocked(validateUsername).mockReturnValue({
        isValid: false,
        error: 'Username must be at least 3 characters',
      });

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');

      fireEvent.change(input, { target: { value: 'ab' } });

      expect(screen.getByRole('alert')).toHaveTextContent('Username must be at least 3 characters');
    });

    it('should clear error when user starts typing again', () => {
      const { rerender } = render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');

      // Set error
      vi.mocked(validateUsername).mockReturnValue({
        isValid: false,
        error: 'Too short',
      });
      fireEvent.change(input, { target: { value: 'ab' } });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Clear error
      vi.mocked(validateUsername).mockReturnValue({ isValid: true });
      fireEvent.change(input, { target: { value: 'abc' } });
      rerender(<SinglePlayerLobby />);

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should have all color options', () => {
      render(<SinglePlayerLobby />);
      const select = screen.getByLabelText('Select your player color') as HTMLSelectElement;

      const options = Array.from(select.options).map((opt) => opt.value);
      expect(options).toContain('red');
      expect(options).toContain('blue');
      expect(options).toContain('green');
    });

    it('should have AI opponent options from 2 to 5', () => {
      render(<SinglePlayerLobby />);
      const select = screen.getByLabelText('Select number of AI opponents') as HTMLSelectElement;

      const options = Array.from(select.options).map((opt) => opt.value);
      expect(options).toEqual(['2', '3', '4', '5']);
    });

    it('should update AI opponents count', () => {
      render(<SinglePlayerLobby />);
      const select = screen.getByLabelText('Select number of AI opponents') as HTMLSelectElement;

      fireEvent.change(select, { target: { value: '4' } });

      expect(select.value).toBe('4');
    });
  });

  describe('Game Summary', () => {
    it('should display game summary with current selections', () => {
      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');

      fireEvent.change(input, { target: { value: 'TestPlayer' } });

      expect(screen.getByText(/You:/)).toBeInTheDocument();
      expect(screen.getByText(/TestPlayer/)).toBeInTheDocument();
      expect(screen.getByText(/AI Opponents:/)).toBeInTheDocument();
      expect(screen.getByText(/Total Players:/)).toBeInTheDocument();
    });

    it('should show placeholder when no username entered', () => {
      render(<SinglePlayerLobby />);
      expect(screen.getByText(/\(enter name\)/)).toBeInTheDocument();
    });

  });

  describe('Start Button', () => {
    it('should disable start button when username is empty', () => {
      render(<SinglePlayerLobby />);
      const button = screen.getByRole('button', { name: /start practice game/i });

      expect(button).toBeDisabled();
    });

    it('should disable start button when username is invalid', () => {
      vi.mocked(validateUsername).mockReturnValue({
        isValid: false,
        error: 'Invalid',
      });

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'ab' } });

      expect(button).toBeDisabled();
    });

    it('should enable start button with valid username', () => {
      vi.mocked(validateUsername).mockReturnValue({ isValid: true });

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'ValidName' } });

      expect(button).not.toBeDisabled();
    });
  });

  describe('Game Creation', () => {
    it('should create game with human player and AI opponents', async () => {
      const mockPush = await mockRouter();
      mockSuccessfulGameCreation();

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'TestPlayer' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(createGameAction).toHaveBeenCalledWith('TestPlayer', 'red', 3);
      });

      // Should add 2 AI opponents
      await waitFor(() => {
        expect(joinGameAction).toHaveBeenCalledTimes(2);
      });

      // Should start the game
      await waitFor(() => {
        expect(startGame).toHaveBeenCalledWith('game-123');
      });

      // Should navigate to game
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/game/game-123?playerId=player-123');
      });
    });

    it('should add correct number of AI opponents', async () => {
      mockSuccessfulGameCreation();

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const aiSelect = screen.getByLabelText('Select number of AI opponents');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'TestPlayer' } });
      fireEvent.change(aiSelect, { target: { value: '4' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(createGameAction).toHaveBeenCalledWith('TestPlayer', 'red', 5);
      });

      await waitFor(() => {
        expect(joinGameAction).toHaveBeenCalledTimes(4);
      });
    });

    it('should use AI names for AI players', async () => {
      mockSuccessfulGameCreation();

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'TestPlayer' } });
      fireEvent.click(button);

      await waitFor(() => {
        const calls = vi.mocked(joinGameAction).mock.calls;
        expect(calls[0][1]).toMatch(/^AI_/);
        expect(calls[1][1]).toMatch(/^AI_/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show toast when game creation fails', async () => {
      const mockAddToast = await mockToast();
      mockFailedGameCreation('Creation failed');

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'TestPlayer' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Failed to start game. Please try again.', 'error');
      });
    });

    it('should show toast when start game fails', async () => {
      const mockAddToast = await mockToast();
      mockFailedGameStart('Start failed');

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'TestPlayer' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Failed to start game. Please try again.', 'error');
      });
    });

  });


  describe('Rate Limiting', () => {
    it('should enforce rate limiting on game creation', async () => {
      const mockAddToast = vi.fn();
      const { useToast } = await import('@/lib/hooks/useToast');
      vi.mocked(useToast).mockReturnValue({
        addToast: mockAddToast,
        toasts: [],
        removeToast: vi.fn(),
        clearAll: vi.fn(),
      });

      vi.mocked(validateUsername).mockReturnValue({ isValid: true });

      render(<SinglePlayerLobby />);
      const input = screen.getByLabelText('Your Username');
      const button = screen.getByRole('button', { name: /start practice game/i });

      fireEvent.change(input, { target: { value: 'TestPlayer' } });

      // Click multiple times rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      // Should show rate limit warning
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.stringContaining('Too many requests'),
          'warning'
        );
      });
    });
  });
});
