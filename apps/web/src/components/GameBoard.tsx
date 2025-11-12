import { useState } from 'react';
import type { GameState, TerritoryId, Player } from '@risk-poc/game-engine';
import { riskMapPaths } from '@/data/riskMapPaths';

interface GameBoardProps {
  state: GameState;
  onTerritoryClick: (id: TerritoryId) => void;
  selectedTerritory: TerritoryId | null;
}

export function GameBoard({ state, onTerritoryClick, selectedTerritory }: GameBoardProps) {
  const [hoveredTerritory, setHoveredTerritory] = useState<TerritoryId | null>(null);
  const territories = state.territories;

  const getPlayerColor = (owner: Player): string => {
    const colors: Record<Player, string> = {
      red: '#e74c3c',
      blue: '#3498db',
      green: '#2ecc71',
      yellow: '#f1c40f',
      purple: '#9b59b6',
      orange: '#e67e22'
    };
    return colors[owner];
  };

  const getStrokeColor = (territoryId: TerritoryId): string => {
    if (selectedTerritory === territoryId) return '#ffd700';
    if (hoveredTerritory === territoryId) return '#ffffff';
    return '#000000';
  };

  const getStrokeWidth = (territoryId: TerritoryId): number => {
    if (selectedTerritory === territoryId) return 4;
    if (hoveredTerritory === territoryId) return 3;
    return 2;
  };

  const getOpacity = (territoryId: TerritoryId): number => {
    if (selectedTerritory === territoryId) return 1;
    if (hoveredTerritory === territoryId) return 0.95;
    return 0.85;
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 750 520"
      style={{
        border: '2px solid #333',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        maxWidth: '1200px',
        maxHeight: '800px'
      }}
    >
      <defs>
        {/* Shadow filter for depth */}
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
        {/* Glow effect for selected territory */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Draw territories */}
      {Object.values(territories).map((territory) => {
        const pathData = riskMapPaths[territory.id];
        if (!pathData || !territory.owner) return null;

        const color = getPlayerColor(territory.owner);
        const isSelected = selectedTerritory === territory.id;
        const isHovered = hoveredTerritory === territory.id;

        return (
          <g key={territory.id}>
            {/* Territory path */}
            <path
              d={pathData.path}
              fill={color}
              stroke={getStrokeColor(territory.id)}
              strokeWidth={getStrokeWidth(territory.id)}
              opacity={getOpacity(territory.id)}
              filter={isSelected ? "url(#glow)" : "url(#shadow)"}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => onTerritoryClick(territory.id)}
              onMouseEnter={() => setHoveredTerritory(territory.id)}
              onMouseLeave={() => setHoveredTerritory(null)}
            />

            {/* Troop count */}
            <text
              x={pathData.labelX}
              y={pathData.labelY}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              pointerEvents="none"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                userSelect: 'none'
              }}
            >
              {territory.troops}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
