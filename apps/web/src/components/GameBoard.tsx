import { useState } from 'react';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { territoryPaths, connectionLines } from '@/data/territoryPaths';

interface GameBoardProps {
  state: GameState;
  onTerritoryClick: (id: TerritoryId) => void;
  selectedTerritory: TerritoryId | null;
}

export function GameBoard({ state, onTerritoryClick, selectedTerritory }: GameBoardProps) {
  const [hoveredTerritory, setHoveredTerritory] = useState<TerritoryId | null>(null);
  const territories = state.territories;

  const getPlayerColor = (owner: string): string => {
    return owner === 'red' ? '#e74c3c' : '#3498db';
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
      width="500"
      height="360"
      viewBox="0 0 500 360"
      style={{
        border: '2px solid #333',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px'
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

      {/* Draw connection lines */}
      <g opacity="0.3">
        {connectionLines.map(({ from, to, points }) => {
          const coords = points.split(' ').map(p => p.split(',').map(Number));
          return (
            <line
              key={`${from}-${to}`}
              x1={coords[0][0]}
              y1={coords[0][1]}
              x2={coords[1][0]}
              y2={coords[1][1]}
              stroke="#555"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          );
        })}
      </g>

      {/* Draw territories */}
      {Object.values(territories).map((territory) => {
        const pathData = territoryPaths[territory.id];
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

            {/* Territory label */}
            <text
              x={pathData.labelPosition.x}
              y={pathData.labelPosition.y - 15}
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
              pointerEvents="none"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                userSelect: 'none'
              }}
            >
              T{territory.id}
            </text>

            {/* Troop count */}
            <text
              x={pathData.labelPosition.x}
              y={pathData.labelPosition.y + 15}
              textAnchor="middle"
              fill="white"
              fontSize="28"
              fontWeight="bold"
              pointerEvents="none"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                userSelect: 'none'
              }}
            >
              {territory.troops}
            </text>

            {/* Troops label */}
            <text
              x={pathData.labelPosition.x}
              y={pathData.labelPosition.y + 30}
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize="11"
              pointerEvents="none"
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                userSelect: 'none'
              }}
            >
              troops
            </text>
          </g>
        );
      })}
    </svg>
  );
}
