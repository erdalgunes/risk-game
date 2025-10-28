import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameControls } from '../GameControls';
import { createTestGame, createTestPlayer } from '@/tests/factories';
import * as gameActions from '@/app/actions/game';
import { ToastProvider } from '@/components/Toast';

// Mock game actions
vi.mock('@/app/actions/game', () => ({
  endTurn: vi.fn(),
  changePhase: vi.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('GameControls', () => {
  const mockGameId = 'game-123';
  const mockPlayerId = 'player-456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gameActions.endTurn).mockResolvedValue({ success: true });
    vi.mocked(gameActions.changePhase).mockResolvedValue({ success: true });
  });

  describe('Waiting Status', () => {
    it('should show waiting message when game status is waiting', () => {
      const game = createTestGame({ status: 'waiting' });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/waiting for players to join/i)).toBeInTheDocument();
    });

    it('should not render when currentPlayerData is undefined', () => {
      const game = createTestGame({ status: 'waiting' });

      const { container } = renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={undefined}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Setup Phase', () => {
    it('should show setup phase instructions', () => {
      const game = createTestGame({ status: 'setup', current_player_order: 0 });
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 10,
      });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByRole('heading', { name: /setup phase/i })).toBeInTheDocument();
      expect(screen.getByText(/place your initial armies/i)).toBeInTheDocument();
      expect(screen.getByText(/armies to place: 10/i)).toBeInTheDocument();
    });

    it('should show armies available count', () => {
      const game = createTestGame({ status: 'setup', current_player_order: 0 });
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 25,
      });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/armies to place: 25/i)).toBeInTheDocument();
    });
  });

  describe('Not Your Turn', () => {
    it('should show waiting message when it is not your turn', () => {
      const game = createTestGame({ status: 'playing', current_player_order: 1 });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/waiting for other players/i)).toBeInTheDocument();
    });
  });

  describe('Reinforcement Phase', () => {
    it('should show reinforcement phase controls', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'reinforcement',
        current_player_order: 0,
      });
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 5,
      });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByRole('heading', { name: /your turn/i })).toBeInTheDocument();
      expect(screen.getByText(/place your reinforcement armies/i)).toBeInTheDocument();
      expect(screen.getByText(/armies to place: 5/i)).toBeInTheDocument();
    });

    it('should show continue button when armies are placed', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'reinforcement',
        current_player_order: 0,
      });
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 0,
      });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(
        screen.getByRole('button', { name: /continue to attack phase/i })
      ).toBeInTheDocument();
    });

    it('should call changePhase when continue button is clicked', async () => {
      const user = userEvent.setup();
      const game = createTestGame({
        status: 'playing',
        phase: 'reinforcement',
        current_player_order: 0,
      });
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 0,
      });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue to attack phase/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(gameActions.changePhase).toHaveBeenCalledWith(mockGameId, mockPlayerId, 'attack');
      });
    });

    it('should not show continue button when armies remain', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'reinforcement',
        current_player_order: 0,
      });
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 3,
      });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(
        screen.queryByRole('button', { name: /continue to attack phase/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Attack Phase', () => {
    it('should show attack phase controls', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'attack',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/attack enemy territories/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip to fortify phase/i })).toBeInTheDocument();
    });

    it('should show attack instructions', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'attack',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/click attacking territory, then target territory/i)).toBeInTheDocument();
    });

    it('should call changePhase when skip to fortify is clicked', async () => {
      const user = userEvent.setup();
      const game = createTestGame({
        status: 'playing',
        phase: 'attack',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip to fortify phase/i });
      await user.click(skipButton);

      await waitFor(() => {
        expect(gameActions.changePhase).toHaveBeenCalledWith(mockGameId, mockPlayerId, 'fortify');
      });
    });
  });

  describe('Fortify Phase', () => {
    it('should show fortify phase controls', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'fortify',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/fortify your territories/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /end turn/i })).toBeInTheDocument();
    });

    it('should show fortify instructions', () => {
      const game = createTestGame({
        status: 'playing',
        phase: 'fortify',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      expect(
        screen.getByText(/move armies between connected territories \(optional\)/i)
      ).toBeInTheDocument();
    });

    it('should call endTurn when end turn button is clicked', async () => {
      const user = userEvent.setup();
      const game = createTestGame({
        status: 'playing',
        phase: 'fortify',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const endTurnButton = screen.getByRole('button', { name: /end turn/i });
      await user.click(endTurnButton);

      await waitFor(() => {
        expect(gameActions.endTurn).toHaveBeenCalledWith(mockGameId, mockPlayerId);
      });
    });

    it('should show loading state during end turn', async () => {
      const user = userEvent.setup();
      vi.mocked(gameActions.endTurn).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const game = createTestGame({
        status: 'playing',
        phase: 'fortify',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const endTurnButton = screen.getByRole('button', { name: /end turn/i });
      await user.click(endTurnButton);

      expect(screen.getByRole('button', { name: /ending turn/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show alert when phase change fails', async () => {
      const user = userEvent.setup();
      vi.mocked(gameActions.changePhase).mockResolvedValue({
        success: false,
        error: 'Invalid phase transition',
      });

      const game = createTestGame({
        status: 'playing',
        phase: 'attack',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip to fortify phase/i });
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid phase transition/i)).toBeInTheDocument();
      });
    });

    it('should show alert when end turn fails', async () => {
      const user = userEvent.setup();
      vi.mocked(gameActions.endTurn).mockResolvedValue({
        success: false,
        error: 'Not your turn',
      });

      const game = createTestGame({
        status: 'playing',
        phase: 'fortify',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const endTurnButton = screen.getByRole('button', { name: /end turn/i });
      await user.click(endTurnButton);

      await waitFor(() => {
        expect(screen.getByText(/not your turn/i)).toBeInTheDocument();
      });
    });

    it('should handle exceptions during phase change', async () => {
      const user = userEvent.setup();
      vi.mocked(gameActions.changePhase).mockRejectedValue(new Error('Network error'));

      const game = createTestGame({
        status: 'playing',
        phase: 'attack',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip to fortify phase/i });
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to change phase/i)).toBeInTheDocument();
      });
    });
  });

  describe('Button States', () => {
    it('should disable buttons during transition', async () => {
      const user = userEvent.setup();
      vi.mocked(gameActions.endTurn).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 200))
      );

      const game = createTestGame({
        status: 'playing',
        phase: 'fortify',
        current_player_order: 0,
      });
      const player = createTestPlayer({ id: mockPlayerId, turn_order: 0 });

      renderWithProviders(
        <GameControls
          game={game}
          currentPlayerData={player}
          territories={[]}
          gameId={mockGameId}
          playerId={mockPlayerId}
        />
      );

      const endTurnButton = screen.getByRole('button', { name: /end turn/i });
      await user.click(endTurnButton);

      const button = screen.getByRole('button', { name: /ending turn/i });
      expect(button).toBeDisabled();
    });
  });
});
