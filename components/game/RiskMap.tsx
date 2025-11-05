/**
 * Risk Map Component
 *
 * Interactive SVG map visualization of the Risk game board.
 * Displays territories, ownership, army counts, and handles territory selection.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { Game, Player, Territory, TerritoryName } from '@/types/game';
import {
  getTerritoryLabelPosition,
  territoryNameToSvgId,
  SVG_VIEWBOX,
} from '@/constants/map-coordinates';

interface RiskMapProps {
  territories: Territory[];
  players: Player[];
  currentPlayerId?: string;
  game: Game | null;
  currentPlayer?: Player;
  onTerritoryClick: (territory: Territory) => void;
  selectedTerritoryId?: string;
  highlightAdjacent?: TerritoryName[];
}

/**
 * Color mappings for player colors
 */
const PLAYER_COLOR_MAP: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  purple: '#9333ea',
  orange: '#ea580c',
};

const NEUTRAL_COLOR = '#9ca3af';
const STROKE_COLOR = '#1e293b';
const HOVER_BRIGHTNESS = 1.2;
const SELECTED_STROKE = '#fbbf24';
const ADJACENT_STROKE = '#3b82f6';

/**
 * RiskMap - Interactive SVG game board visualization
 */
export function RiskMap({
  territories,
  players,
  currentPlayerId,
  game,
  onTerritoryClick,
  selectedTerritoryId,
  highlightAdjacent = [],
}: RiskMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Create territory lookup map for O(1) access
  const territoryMap = new Map(territories.map((t) => [t.territory_name, t]));

  // Create player lookup map for O(1) access
  const playerMap = new Map(players.map((p) => [p.id, p]));

  /**
   * Load and inject SVG from public folder
   */
  useEffect(() => {
    const loadSVG = async () => {
      try {
        const response = await fetch('/risk-map.svg');
        const svgText = await response.text();

        if (svgRef.current) {
          svgRef.current.innerHTML = svgText;
          setSvgLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load SVG map:', error);
      }
    };

    loadSVG();
  }, []);

  /**
   * Update territory colors and add event listeners
   */
  useEffect(() => {
    if (!svgLoaded || !svgRef.current) return;

    const svg = svgRef.current;
    const cleanupFunctions: Array<() => void> = [];

    /**
     * Get fill color for a territory based on owner
     */
    const getTerritoryColor = (territory: Territory): string => {
      if (!territory.owner_id) return NEUTRAL_COLOR;
      const player = playerMap.get(territory.owner_id);
      return player ? PLAYER_COLOR_MAP[player.color] || NEUTRAL_COLOR : NEUTRAL_COLOR;
    };

    territories.forEach((territory) => {
      const svgId = territoryNameToSvgId(territory.territory_name);
      const pathElement = svg.querySelector(`#${svgId}`) as SVGPathElement;

      if (!pathElement) {
        console.warn(`Territory path not found: ${svgId}`);
        return;
      }

      // Set fill color
      const fillColor = getTerritoryColor(territory);
      pathElement.setAttribute('fill', fillColor);
      pathElement.setAttribute('stroke', STROKE_COLOR);
      pathElement.setAttribute('stroke-width', '1');
      pathElement.style.cursor = 'pointer';
      pathElement.style.transition = 'filter 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease';

      // Add selection highlighting
      if (territory.id === selectedTerritoryId) {
        pathElement.setAttribute('stroke', SELECTED_STROKE);
        pathElement.setAttribute('stroke-width', '3');
      } else if (highlightAdjacent.includes(territory.territory_name)) {
        pathElement.setAttribute('stroke', ADJACENT_STROKE);
        pathElement.setAttribute('stroke-width', '2');
      }

      // Event handlers
      const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        onTerritoryClick(territory);
      };

      const handleMouseEnter = () => {
        setHoveredTerritory(territory.territory_name);
        pathElement.style.filter = `brightness(${HOVER_BRIGHTNESS})`;
      };

      const handleMouseLeave = () => {
        setHoveredTerritory(null);
        pathElement.style.filter = 'none';
      };

      pathElement.addEventListener('click', handleClick);
      pathElement.addEventListener('mouseenter', handleMouseEnter);
      pathElement.addEventListener('mouseleave', handleMouseLeave);

      // Store cleanup function for this territory
      cleanupFunctions.push(() => {
        pathElement.removeEventListener('click', handleClick);
        pathElement.removeEventListener('mouseenter', handleMouseEnter);
        pathElement.removeEventListener('mouseleave', handleMouseLeave);
      });
    });

    // Cleanup all event listeners on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [svgLoaded, territories, selectedTerritoryId, highlightAdjacent, onTerritoryClick, territoryMap, playerMap]);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-96 bg-surface-container rounded-lg">
        <p className="text-surface-on opacity-70">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-lg shadow-md3-3 p-md3-4">
      {/* Map Header */}
      <div className="mb-md3-4">
        <h2 className="text-title-large font-bold text-surface-on">Game Map</h2>
        {hoveredTerritory && (
          <p className="text-body-medium text-surface-on opacity-70 mt-md3-1">
            {hoveredTerritory.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
        )}
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full bg-white rounded-md3-md overflow-hidden shadow-md3-1">
        <svg
          ref={svgRef}
          viewBox={`${SVG_VIEWBOX.x} ${SVG_VIEWBOX.y} ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`}
          className="w-full h-auto"
          style={{ maxHeight: '600px' }}
        >
          {/* SVG content will be injected here */}
        </svg>

        {/* Army Count Overlays */}
        {svgLoaded && (
          <svg
            viewBox={`${SVG_VIEWBOX.x} ${SVG_VIEWBOX.y} ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`}
            className="absolute top-0 left-0 w-full h-auto pointer-events-none"
            style={{ maxHeight: '600px' }}
          >
            {territories.map((territory) => {
              const pos = getTerritoryLabelPosition(territory.territory_name);
              const isOwned = territory.owner_id === currentPlayerId;
              const isSelected = territory.id === selectedTerritoryId;

              return (
                <g key={territory.id}>
                  {/* Background circle for army count */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill="rgba(0, 0, 0, 0.7)"
                    stroke={isSelected ? SELECTED_STROKE : 'white'}
                    strokeWidth={isSelected ? '2' : '1'}
                  />
                  {/* Army count text */}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-xs font-bold"
                    fill="white"
                    style={{
                      fontSize: '14px',
                      fontWeight: isOwned ? '800' : '600',
                    }}
                  >
                    {territory.army_count}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Map Legend */}
      <div className="mt-md3-4 flex flex-wrap gap-md3-3">
        {players.map((player) => {
          const territoryCount = territories.filter(
            (t) => t.owner_id === player.id
          ).length;
          const totalArmies = territories
            .filter((t) => t.owner_id === player.id)
            .reduce((sum, t) => sum + t.army_count, 0);

          return (
            <div
              key={player.id}
              className="flex items-center gap-md3-2 px-md3-3 py-md3-2 bg-surface-container rounded-md3-sm"
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-outline"
                style={{ backgroundColor: PLAYER_COLOR_MAP[player.color] }}
              />
              <div className="text-sm">
                <span className="font-medium text-surface-on">
                  {player.username}
                  {player.id === currentPlayerId && ' (You)'}
                  {player.is_eliminated && ' (Eliminated)'}
                </span>
                <span className="text-surface-on-variant ml-md3-2">
                  {territoryCount} territories · {totalArmies} armies
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-md3-4 p-md3-3 bg-primary-container rounded-md3-sm text-sm text-primary-on">
        <strong>Click</strong> territories to select them.{' '}
        {highlightAdjacent.length > 0 && (
          <span className="text-blue-700">
            Blue borders show adjacent territories.
          </span>
        )}
      </div>
    </div>
  );
}
