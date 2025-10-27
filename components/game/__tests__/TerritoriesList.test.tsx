import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerritoriesList } from '../TerritoriesList';
import { createTestGame, createTestPlayer, createTestTerritory } from '@/tests/factories';

describe('TerritoriesList', () => {
  const mockGameId = 'game-123';
  const mockPlayerId = 'player-456';

  describe('Rendering', () => {
    it('should render territories list heading', () => {
      render(
        <TerritoriesList
          territories={[]}
          players={[]}
          currentPlayerId={undefined}
        />
      );

      expect(screen.getByRole('heading', { name: /territories/i })).toBeInTheDocument();
    });

    it('should group territories by continent', () => {
      const player = createTestPlayer({ id: mockPlayerId });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
        }),
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'brazil',
          owner_id: mockPlayerId,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/north america/i)).toBeInTheDocument();
      expect(screen.getByText(/south america/i)).toBeInTheDocument();
    });

    it('should show continent bonus', () => {
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[]}
          currentPlayerId={mockPlayerId}
        />
      );

      // North America has +5 bonus - use getAllByText since multiple continents are rendered
      const bonusTexts = screen.getAllByText(/bonus: \+\d+ armies/i);
      expect(bonusTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Territory Display', () => {
    it('should show territory name', () => {
      const player = createTestPlayer({ id: mockPlayerId });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      // Territory name is capitalized and rendered
      expect(screen.getByText(/alaska/i)).toBeInTheDocument();
    });

    it('should show territory army count', () => {
      const player = createTestPlayer({ id: mockPlayerId });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 5,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show territory owner name', () => {
      const player = createTestPlayer({ id: mockPlayerId, username: 'TestPlayer' });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    it('should show Unclaimed for territory without owner', () => {
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: null,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[]}
          currentPlayerId={mockPlayerId}
        />
      );

      expect(screen.getByText('Unclaimed')).toBeInTheDocument();
    });
  });

  describe('Territory Clicks', () => {
    it('should call onTerritoryClick when clickable territory is clicked', async () => {
      const user = userEvent.setup();
      const onTerritoryClick = vi.fn();
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 5,
      });
      const currentPlayer = player;
      const game = createTestGame({
        game_id: mockGameId,
        status: 'setup',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 1,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={currentPlayer}
          onTerritoryClick={onTerritoryClick}
        />
      );

      const territory = screen.getByText(/alaska/i);
      await user.click(territory);

      expect(onTerritoryClick).toHaveBeenCalledWith(territories[0]);
    });

    it('should not call onTerritoryClick for enemy territory', async () => {
      const user = userEvent.setup();
      const onTerritoryClick = vi.fn();
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 5,
      });
      const game = createTestGame({
        game_id: mockGameId,
        status: 'setup',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: 'other-player',
          army_count: 1,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={player}
          onTerritoryClick={onTerritoryClick}
        />
      );

      const territory = screen.getByText(/alaska/i);
      await user.click(territory);

      expect(onTerritoryClick).not.toHaveBeenCalled();
    });

    it('should not call onTerritoryClick when no armies available', async () => {
      const user = userEvent.setup();
      const onTerritoryClick = vi.fn();
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 0,
      });
      const game = createTestGame({
        game_id: mockGameId,
        status: 'setup',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 1,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={player}
          onTerritoryClick={onTerritoryClick}
        />
      );

      const territory = screen.getByText(/alaska/i);
      await user.click(territory);

      expect(onTerritoryClick).not.toHaveBeenCalled();
    });

    it('should not be clickable during attack phase', async () => {
      const user = userEvent.setup();
      const onTerritoryClick = vi.fn();
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 5,
      });
      const game = createTestGame({
        game_id: mockGameId,
        status: 'playing',
        phase: 'attack',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 1,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={player}
          onTerritoryClick={onTerritoryClick}
        />
      );

      const territory = screen.getByText(/alaska/i);
      await user.click(territory);

      expect(onTerritoryClick).not.toHaveBeenCalled();
    });

    it('should be clickable during reinforcement phase', async () => {
      const user = userEvent.setup();
      const onTerritoryClick = vi.fn();
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 5,
      });
      const game = createTestGame({
        game_id: mockGameId,
        status: 'playing',
        phase: 'reinforcement',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 1,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={player}
          onTerritoryClick={onTerritoryClick}
        />
      );

      const territory = screen.getByText(/alaska/i);
      await user.click(territory);

      expect(onTerritoryClick).toHaveBeenCalled();
    });
  });

  describe('Visual Styling', () => {
    it('should highlight your clickable territories', () => {
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 5,
      });
      const game = createTestGame({
        game_id: mockGameId,
        status: 'setup',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 1,
        }),
      ];

      const { container } = render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={player}
          onTerritoryClick={vi.fn()}
        />
      );

      const clickableTerritory = container.querySelector('[class*="bg-green-900"]');
      expect(clickableTerritory).toBeInTheDocument();
    });

    it('should show different styling for your non-clickable territories', () => {
      const player = createTestPlayer({
        id: mockPlayerId,
        turn_order: 0,
        armies_available: 0,
      });
      const game = createTestGame({
        game_id: mockGameId,
        status: 'setup',
        current_player_order: 0,
      });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 1,
        }),
      ];

      const { container } = render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
          game={game}
          currentPlayer={player}
          onTerritoryClick={vi.fn()}
        />
      );

      const yourTerritory = container.querySelector('[class*="bg-blue-900"]');
      expect(yourTerritory).toBeInTheDocument();
    });
  });

  describe('Multiple Territories', () => {
    it('should render territories from different continents', () => {
      const player = createTestPlayer({ id: mockPlayerId });
      const territories = [
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'alaska',
          owner_id: mockPlayerId,
          army_count: 3,
        }),
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'brazil',
          owner_id: mockPlayerId,
          army_count: 5,
        }),
        createTestTerritory({
          game_id: mockGameId,
          territory_name: 'egypt',
          owner_id: mockPlayerId,
          army_count: 2,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      expect(screen.getByText(/alaska/i)).toBeInTheDocument();
      expect(screen.getByText(/brazil/i)).toBeInTheDocument();
      expect(screen.getByText(/egypt/i)).toBeInTheDocument();
    });

    it('should group territories correctly by continent', () => {
      const player = createTestPlayer({ id: mockPlayerId });
      const territories = [
        createTestTerritory({
          territory_name: 'alaska',
          owner_id: mockPlayerId,
        }),
        createTestTerritory({
          territory_name: 'alberta',
          owner_id: mockPlayerId,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      const northAmericaSection = screen.getByText(/north america/i).closest('div');
      expect(northAmericaSection).toBeInTheDocument();

      if (northAmericaSection) {
        expect(within(northAmericaSection).getByText(/alaska/i)).toBeInTheDocument();
        expect(within(northAmericaSection).getByText(/alberta/i)).toBeInTheDocument();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty territories array', () => {
      render(
        <TerritoriesList
          territories={[]}
          players={[]}
          currentPlayerId={undefined}
        />
      );

      expect(screen.getByRole('heading', { name: /territories/i })).toBeInTheDocument();
    });

    it('should handle undefined onTerritoryClick', async () => {
      const user = userEvent.setup();
      const player = createTestPlayer({
        id: mockPlayerId,
        armies_available: 5,
      });
      const territories = [
        createTestTerritory({
          territory_name: 'alaska',
          owner_id: mockPlayerId,
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[player]}
          currentPlayerId={mockPlayerId}
        />
      );

      const territory = screen.getByText(/alaska/i);
      // Should not throw error
      await user.click(territory);
    });

    it('should handle territory with unknown owner', () => {
      const territories = [
        createTestTerritory({
          territory_name: 'alaska',
          owner_id: 'unknown-player-id',
        }),
      ];

      render(
        <TerritoriesList
          territories={territories}
          players={[]}
          currentPlayerId={mockPlayerId}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});
