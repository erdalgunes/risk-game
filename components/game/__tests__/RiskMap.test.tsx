import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RiskMap } from '../RiskMap';
import { createTestGame, createTestPlayer, createTestTerritory } from '@/tests/factories';

// Mock SVG content
const mockSvgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="182 114 720 405">
    <path id="alaska" d="M0,0 L100,0 L100,100 L0,100 Z" />
    <path id="alberta" d="M100,0 L200,0 L200,100 L100,100 Z" />
    <path id="brazil" d="M200,0 L300,0 L300,100 L200,100 Z" />
  </svg>
`;

describe('RiskMap', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockSvgContent),
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SVG Loading', () => {
    it('should load SVG from /risk-map.svg', async () => {
      const game = createTestGame();
      const player = createTestPlayer();
      const territories = [createTestTerritory({ territory_name: 'alaska' })];

      render(
        <RiskMap
          territories={territories}
          players={[player]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/risk-map.svg');
      });
    });

    it('should show loading state when game is null', () => {
      render(
        <RiskMap
          territories={[]}
          players={[]}
          game={null}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByText(/loading map/i)).toBeInTheDocument();
    });

    it('should handle SVG loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const game = createTestGame();
      const territories = [createTestTerritory()];

      render(
        <RiskMap
          territories={territories}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load SVG map:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Map Header', () => {
    it('should render map title', async () => {
      const game = createTestGame();
      const territories = [createTestTerritory()];

      render(
        <RiskMap
          territories={territories}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: /game map/i })).toBeInTheDocument();
    });

    it('should show hovered territory name', async () => {
      const game = createTestGame();
      const player = createTestPlayer({ id: 'p1' });
      const territory = createTestTerritory({
        territory_name: 'alaska',
        owner_id: 'p1',
      });

      render(
        <RiskMap
          territories={[territory]}
          players={[player]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Wait for SVG to load and be injected
      await waitFor(() => {
        const pathElement = document.querySelector('#alaska');
        expect(pathElement).toBeInTheDocument();
      });

      const pathElement = document.querySelector('#alaska') as SVGPathElement;
      pathElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      await waitFor(() => {
        expect(screen.getByText(/alaska/i)).toBeInTheDocument();
      });
    });
  });

  describe('Territory Coloring', () => {
    it('should apply player color to owned territories', async () => {
      const game = createTestGame();
      const player = createTestPlayer({ id: 'p1', color: 'red' });
      const territory = createTestTerritory({
        territory_name: 'alaska',
        owner_id: 'p1',
      });

      render(
        <RiskMap
          territories={[territory]}
          players={[player]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const pathElement = document.querySelector('#alaska') as SVGPathElement;
        expect(pathElement).toBeInTheDocument();
        expect(pathElement.getAttribute('fill')).toBe('#dc2626'); // red color
      });
    });

    it('should apply neutral color to unowned territories', async () => {
      const game = createTestGame();
      const territory = createTestTerritory({
        territory_name: 'alaska',
        owner_id: null,
      });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const pathElement = document.querySelector('#alaska') as SVGPathElement;
        expect(pathElement).toBeInTheDocument();
        expect(pathElement.getAttribute('fill')).toBe('#9ca3af'); // neutral color
      });
    });

    it('should apply correct colors for different player colors', async () => {
      const game = createTestGame();
      const players = [
        createTestPlayer({ id: 'p1', color: 'red' }),
        createTestPlayer({ id: 'p2', color: 'blue' }),
        createTestPlayer({ id: 'p3', color: 'green' }),
      ];
      const territories = [
        createTestTerritory({ territory_name: 'alaska', owner_id: 'p1' }),
        createTestTerritory({ territory_name: 'alberta', owner_id: 'p2' }),
        createTestTerritory({ territory_name: 'brazil', owner_id: 'p3' }),
      ];

      render(
        <RiskMap
          territories={territories}
          players={players}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const alaska = document.querySelector('#alaska') as SVGPathElement;
        const alberta = document.querySelector('#alberta') as SVGPathElement;
        const brazil = document.querySelector('#brazil') as SVGPathElement;

        expect(alaska.getAttribute('fill')).toBe('#dc2626'); // red
        expect(alberta.getAttribute('fill')).toBe('#2563eb'); // blue
        expect(brazil.getAttribute('fill')).toBe('#16a34a'); // green
      });
    });
  });

  describe('Territory Selection', () => {
    it('should highlight selected territory with gold stroke', async () => {
      const game = createTestGame();
      const territory = createTestTerritory({
        id: 't1',
        territory_name: 'alaska',
      });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          selectedTerritoryId="t1"
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const pathElement = document.querySelector('#alaska') as SVGPathElement;
        expect(pathElement).toBeInTheDocument();
        expect(pathElement.getAttribute('stroke')).toBe('#fbbf24'); // selected color
        expect(pathElement.getAttribute('stroke-width')).toBe('3');
      });
    });

    it('should highlight adjacent territories with blue stroke', async () => {
      const game = createTestGame();
      const territories = [
        createTestTerritory({ territory_name: 'alaska' }),
        createTestTerritory({ territory_name: 'alberta' }),
      ];

      render(
        <RiskMap
          territories={territories}
          players={[]}
          game={game}
          highlightAdjacent={['alberta']}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const alberta = document.querySelector('#alberta') as SVGPathElement;
        expect(alberta).toBeInTheDocument();
        expect(alberta.getAttribute('stroke')).toBe('#3b82f6'); // adjacent color
        expect(alberta.getAttribute('stroke-width')).toBe('2');
      });
    });

    it('should show adjacent highlight instructions when territories are highlighted', async () => {
      const game = createTestGame();
      const territories = [createTestTerritory({ territory_name: 'alaska' })];

      render(
        <RiskMap
          territories={territories}
          players={[]}
          game={game}
          highlightAdjacent={['alberta']}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/blue borders show adjacent territories/i)).toBeInTheDocument();
      });
    });
  });

  describe('Territory Interactivity', () => {
    it('should apply cursor pointer style to territories', async () => {
      const game = createTestGame();
      const territory = createTestTerritory({ territory_name: 'alaska' });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const pathElement = document.querySelector('#alaska') as SVGPathElement;
        expect(pathElement.style.cursor).toBe('pointer');
      });
    });

    it('should add event listeners to all territories', async () => {
      const game = createTestGame();
      const territories = [
        createTestTerritory({ territory_name: 'alaska' }),
        createTestTerritory({ territory_name: 'alberta' }),
        createTestTerritory({ territory_name: 'brazil' }),
      ];

      render(
        <RiskMap
          territories={territories}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const alaska = document.querySelector('#alaska') as SVGPathElement;
        const alberta = document.querySelector('#alberta') as SVGPathElement;
        const brazil = document.querySelector('#brazil') as SVGPathElement;

        expect(alaska.style.cursor).toBe('pointer');
        expect(alberta.style.cursor).toBe('pointer');
        expect(brazil.style.cursor).toBe('pointer');
      });
    });
  });

  describe('Army Count Overlays', () => {
    it('should display army counts on territories', async () => {
      const game = createTestGame();
      const territory = createTestTerritory({
        territory_name: 'alaska',
        army_count: 15,
      });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    it('should show army counts for all territories', async () => {
      const game = createTestGame();
      const territories = [
        createTestTerritory({ territory_name: 'alaska', army_count: 5 }),
        createTestTerritory({ territory_name: 'alberta', army_count: 10 }),
        createTestTerritory({ territory_name: 'brazil', army_count: 3 }),
      ];

      render(
        <RiskMap
          territories={territories}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Player Legend', () => {
    it('should display all players in legend', async () => {
      const game = createTestGame();
      const players = [
        createTestPlayer({ id: 'p1', username: 'Alice', color: 'red' }),
        createTestPlayer({ id: 'p2', username: 'Bob', color: 'blue' }),
      ];

      render(
        <RiskMap
          territories={[]}
          players={players}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should show (You) indicator for current player', async () => {
      const game = createTestGame();
      const players = [
        createTestPlayer({ id: 'p1', username: 'Alice' }),
        createTestPlayer({ id: 'p2', username: 'Bob' }),
      ];

      render(
        <RiskMap
          territories={[]}
          players={players}
          currentPlayerId="p1"
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByText(/alice \(you\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/bob \(you\)/i)).not.toBeInTheDocument();
    });

    it('should show territory count for each player', async () => {
      const game = createTestGame();
      const players = [
        createTestPlayer({ id: 'p1', username: 'Alice' }),
        createTestPlayer({ id: 'p2', username: 'Bob' }),
      ];
      const territories = [
        createTestTerritory({ territory_name: 'alaska', owner_id: 'p1' }),
        createTestTerritory({ territory_name: 'alberta', owner_id: 'p1' }),
        createTestTerritory({ territory_name: 'brazil', owner_id: 'p2' }),
      ];

      render(
        <RiskMap
          territories={territories}
          players={players}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      // Alice owns 2 territories
      expect(screen.getByText(/2 territories/i)).toBeInTheDocument();
      // Bob owns 1 territory
      expect(screen.getByText(/1 territories/i)).toBeInTheDocument();
    });

    it('should show total army count for each player', async () => {
      const game = createTestGame();
      const players = [
        createTestPlayer({ id: 'p1', username: 'Alice' }),
        createTestPlayer({ id: 'p2', username: 'Bob' }),
      ];
      const territories = [
        createTestTerritory({ territory_name: 'alaska', owner_id: 'p1', army_count: 5 }),
        createTestTerritory({ territory_name: 'alberta', owner_id: 'p1', army_count: 10 }),
        createTestTerritory({ territory_name: 'brazil', owner_id: 'p2', army_count: 7 }),
      ];

      render(
        <RiskMap
          territories={territories}
          players={players}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      // Alice has 15 total armies (5 + 10)
      expect(screen.getByText(/15 armies/i)).toBeInTheDocument();
      // Bob has 7 total armies
      expect(screen.getByText(/7 armies/i)).toBeInTheDocument();
    });

    it('should show eliminated status for eliminated players', async () => {
      const game = createTestGame();
      const players = [
        createTestPlayer({ id: 'p1', username: 'Alice', is_eliminated: false }),
        createTestPlayer({ id: 'p2', username: 'Bob', is_eliminated: true }),
      ];

      render(
        <RiskMap
          territories={[]}
          players={players}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByText(/bob/i)).toBeInTheDocument();
      expect(screen.getByText(/eliminated/i)).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('should have CSS transition for hover effects', async () => {
      const game = createTestGame();
      const territory = createTestTerritory({ territory_name: 'alaska' });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const pathElement = document.querySelector('#alaska') as SVGPathElement;
        expect(pathElement).toBeInTheDocument();
        expect(pathElement.style.transition).toContain('filter');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing SVG path gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const game = createTestGame();
      const territory = createTestTerritory({ territory_name: 'nonexistent-territory' as any });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Territory path not found')
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle empty territory list', async () => {
      const game = createTestGame();

      render(
        <RiskMap
          territories={[]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: /game map/i })).toBeInTheDocument();
    });

    it('should handle territories with no owner', async () => {
      const game = createTestGame();
      const territory = createTestTerritory({
        territory_name: 'alaska',
        owner_id: null,
      });

      render(
        <RiskMap
          territories={[territory]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const pathElement = document.querySelector('#alaska') as SVGPathElement;
        expect(pathElement.getAttribute('fill')).toBe('#9ca3af'); // neutral color
      });
    });
  });

  describe('Instructions', () => {
    it('should show click instructions', async () => {
      const game = createTestGame();

      render(
        <RiskMap
          territories={[]}
          players={[]}
          game={game}
          onTerritoryClick={vi.fn()}
        />
      );

      expect(screen.getByText(/click/i)).toBeInTheDocument();
      expect(screen.getByText(/territories to select them/i)).toBeInTheDocument();
    });
  });
});
