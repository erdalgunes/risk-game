'use client';

import type { GameState, TerritoryId } from '@risk-poc/game-engine';

interface GameBoardProps {
  gameState: GameState;
  selectedTerritory: TerritoryId | null;
  onTerritoryClick: (territoryId: TerritoryId) => void;
}

/**
 * Simple SVG board with 6 rectangles
 * Layout:
 * [1] [2] [3]
 * [4] [5] [6]
 */
export default function GameBoard({ gameState, selectedTerritory, onTerritoryClick }: GameBoardProps) {
  const RECT_WIDTH = 180;
  const RECT_HEIGHT = 120;
  const GAP = 20;

  const getTerritoryPosition = (id: TerritoryId): { x: number; y: number } => {
    const positions: Record<TerritoryId, { x: number; y: number }> = {
      '1': { x: 0, y: 0 },
      '2': { x: RECT_WIDTH + GAP, y: 0 },
      '3': { x: (RECT_WIDTH + GAP) * 2, y: 0 },
      '4': { x: 0, y: RECT_HEIGHT + GAP },
      '5': { x: RECT_WIDTH + GAP, y: RECT_HEIGHT + GAP },
      '6': { x: (RECT_WIDTH + GAP) * 2, y: RECT_HEIGHT + GAP },
    };
    return positions[id];
  };

  const getPlayerColor = (ownerId: string): string => {
    const player = gameState.players.find((p) => p.id === ownerId);
    return player?.color === 'red' ? '#dc2626' : '#2563eb';
  };

  const getTerritoryBorder = (id: TerritoryId): string => {
    if (selectedTerritory === id) return '#fbbf24';
    return '#374151';
  };

  const drawConnections = () => {
    const connections: Array<[TerritoryId, TerritoryId]> = [
      ['1', '2'],
      ['2', '3'],
      ['1', '4'],
      ['2', '5'],
      ['3', '6'],
      ['4', '5'],
      ['5', '6'],
    ];

    return connections.map(([from, to], index) => {
      const fromPos = getTerritoryPosition(from);
      const toPos = getTerritoryPosition(to);

      const x1 = fromPos.x + RECT_WIDTH / 2;
      const y1 = fromPos.y + RECT_HEIGHT / 2;
      const x2 = toPos.x + RECT_WIDTH / 2;
      const y2 = toPos.y + RECT_HEIGHT / 2;

      return (
        <line
          key={`connection-${index}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#4b5563"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      );
    });
  };

  const viewBoxWidth = (RECT_WIDTH + GAP) * 3;
  const viewBoxHeight = (RECT_HEIGHT + GAP) * 2;

  return (
    <div className="bg-gray-800 rounded-lg p-8 mb-6">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full max-w-4xl mx-auto"
        style={{ maxHeight: '500px' }}
      >
        {/* Draw connections first (behind territories) */}
        {drawConnections()}

        {/* Draw territories */}
        {gameState.territories.map((territory) => {
          const pos = getTerritoryPosition(territory.id);
          const color = getPlayerColor(territory.ownerId);
          const border = getTerritoryBorder(territory.id);
          const isSelected = selectedTerritory === territory.id;

          return (
            <g
              key={territory.id}
              onClick={() => onTerritoryClick(territory.id)}
              className="cursor-pointer transition-transform hover:scale-105"
              style={{ transformOrigin: `${pos.x + RECT_WIDTH / 2}px ${pos.y + RECT_HEIGHT / 2}px` }}
            >
              {/* Territory rectangle */}
              <rect
                x={pos.x}
                y={pos.y}
                width={RECT_WIDTH}
                height={RECT_HEIGHT}
                fill={color}
                stroke={border}
                strokeWidth={isSelected ? '4' : '2'}
                rx="8"
                opacity="0.9"
              />

              {/* Territory name */}
              <text
                x={pos.x + RECT_WIDTH / 2}
                y={pos.y + RECT_HEIGHT / 3}
                textAnchor="middle"
                fill="white"
                fontSize="18"
                fontWeight="bold"
              >
                {territory.name}
              </text>

              {/* Troop count */}
              <text
                x={pos.x + RECT_WIDTH / 2}
                y={pos.y + (RECT_HEIGHT * 2) / 3}
                textAnchor="middle"
                fill="white"
                fontSize="32"
                fontWeight="bold"
              >
                {territory.troops}
              </text>

              {/* Owner indicator */}
              <text
                x={pos.x + RECT_WIDTH / 2}
                y={pos.y + (RECT_HEIGHT * 5) / 6}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                opacity="0.7"
              >
                {gameState.players.find((p) => p.id === territory.ownerId)?.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span className="text-sm">{gameState.players[0].name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-sm">{gameState.players[1].name}</span>
        </div>
        {selectedTerritory && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
