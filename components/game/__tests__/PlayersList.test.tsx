import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayersList } from '../PlayersList';
import { createTestPlayer } from '@/tests/factories';

describe('PlayersList', () => {
  describe('Rendering', () => {
    it('should render players list heading', () => {
      render(<PlayersList players={[]} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.getByRole('heading', { name: /players/i })).toBeInTheDocument();
    });

    it('should render empty list when no players', () => {
      const { container } = render(
        <PlayersList players={[]} currentPlayer={null} yourPlayerId={undefined} />
      );

      const playerItems = container.querySelectorAll('[class*="space-y-2"] > div');
      expect(playerItems).toHaveLength(0);
    });

    it('should render all players', () => {
      const players = [
        createTestPlayer({ id: 'p1', username: 'Alice', color: 'red' }),
        createTestPlayer({ id: 'p2', username: 'Bob', color: 'blue' }),
        createTestPlayer({ id: 'p3', username: 'Charlie', color: 'green' }),
      ];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  describe('Player Display', () => {
    it('should show player username', () => {
      const players = [createTestPlayer({ username: 'TestPlayer' })];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    it('should show player color indicator', () => {
      const players = [createTestPlayer({ color: 'red' })];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      const colorIndicator = document.querySelector('[style*="background-color"]');
      expect(colorIndicator).toBeInTheDocument();
    });

    it('should show player turn order', () => {
      const players = [createTestPlayer({ turn_order: 2 })];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.getByText(/turn: 3/i)).toBeInTheDocument(); // turn_order + 1
    });

    it('should show player armies available', () => {
      const players = [createTestPlayer({ armies_available: 15 })];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.getByText(/armies: 15/i)).toBeInTheDocument();
    });
  });

  describe('Current Turn Indicator', () => {
    it('should highlight current player', () => {
      const player = createTestPlayer({ id: 'current-player' });
      const players = [player];

      render(
        <PlayersList
          players={players}
          currentPlayer={player}
          yourPlayerId={undefined}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should not show active badge for non-current players', () => {
      const currentPlayer = createTestPlayer({ id: 'p1' });
      const otherPlayer = createTestPlayer({ id: 'p2' });
      const players = [currentPlayer, otherPlayer];

      render(
        <PlayersList
          players={players}
          currentPlayer={currentPlayer}
          yourPlayerId={undefined}
        />
      );

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges).toHaveLength(1);
    });

    it('should apply different styling to current player', () => {
      const player = createTestPlayer({ id: 'current-player' });
      const players = [player];

      const { container } = render(
        <PlayersList
          players={players}
          currentPlayer={player}
          yourPlayerId={undefined}
        />
      );

      const playerCard = container.querySelector('[class*="bg-blue-900"]');
      expect(playerCard).toBeInTheDocument();
    });
  });

  describe('Your Player Indicator', () => {
    it('should show (You) for your player', () => {
      const yourPlayer = createTestPlayer({ id: 'your-id', username: 'You' });
      const players = [yourPlayer];

      render(
        <PlayersList
          players={players}
          currentPlayer={null}
          yourPlayerId="your-id"
        />
      );

      expect(screen.getByText(/you \(you\)/i)).toBeInTheDocument();
    });

    it('should not show (You) for other players', () => {
      const yourPlayer = createTestPlayer({ id: 'your-id', username: 'Alice' });
      const otherPlayer = createTestPlayer({ id: 'other-id', username: 'Bob' });
      const players = [yourPlayer, otherPlayer];

      render(
        <PlayersList
          players={players}
          currentPlayer={null}
          yourPlayerId="your-id"
        />
      );

      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Bob (You)')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Players', () => {
    it('should render all players with correct details', () => {
      const players = [
        createTestPlayer({
          id: 'p1',
          username: 'Player1',
          color: 'red',
          turn_order: 0,
          armies_available: 5,
        }),
        createTestPlayer({
          id: 'p2',
          username: 'Player2',
          color: 'blue',
          turn_order: 1,
          armies_available: 3,
        }),
        createTestPlayer({
          id: 'p3',
          username: 'Player3',
          color: 'green',
          turn_order: 2,
          armies_available: 10,
        }),
      ];

      const currentPlayer = players[1];

      render(
        <PlayersList
          players={players}
          currentPlayer={currentPlayer}
          yourPlayerId="p1"
        />
      );

      // Check all usernames
      expect(screen.getByText('Player1 (You)')).toBeInTheDocument();
      expect(screen.getByText('Player2')).toBeInTheDocument();
      expect(screen.getByText('Player3')).toBeInTheDocument();

      // Check turn orders
      expect(screen.getByText(/turn: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/turn: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/turn: 3/i)).toBeInTheDocument();

      // Check armies
      expect(screen.getByText(/armies: 5/i)).toBeInTheDocument();
      expect(screen.getByText(/armies: 3/i)).toBeInTheDocument();
      expect(screen.getByText(/armies: 10/i)).toBeInTheDocument();

      // Check active badge only on current player
      expect(screen.getByText('Active')).toBeInTheDocument();
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges).toHaveLength(1);
    });

    it('should handle both current player and your player being the same', () => {
      const yourPlayer = createTestPlayer({ id: 'p1', username: 'You', turn_order: 0 });
      const otherPlayer = createTestPlayer({ id: 'p2', username: 'Other', turn_order: 1 });
      const players = [yourPlayer, otherPlayer];

      render(
        <PlayersList
          players={players}
          currentPlayer={yourPlayer}
          yourPlayerId="p1"
        />
      );

      expect(screen.getByText('You (You)')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null currentPlayer', () => {
      const players = [createTestPlayer({ username: 'Player1' })];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('should handle undefined yourPlayerId', () => {
      const players = [createTestPlayer({ id: 'p1', username: 'Player1' })];

      render(<PlayersList players={players} currentPlayer={null} yourPlayerId={undefined} />);

      expect(screen.queryByText('(You)')).not.toBeInTheDocument();
    });

    it('should render with single player', () => {
      const player = createTestPlayer({
        username: 'Solitaire',
        color: 'red',
        turn_order: 0,
      });

      render(
        <PlayersList
          players={[player]}
          currentPlayer={player}
          yourPlayerId={player.id}
        />
      );

      expect(screen.getByText('Solitaire (You)')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });
});
