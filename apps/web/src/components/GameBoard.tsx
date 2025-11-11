import type { GameState, TerritoryId } from '@risk-poc/game-engine';

interface GameBoardProps {
  state: GameState;
  onTerritoryClick: (id: TerritoryId) => void;
  selectedTerritory: TerritoryId | null;
}

export function GameBoard({ state, onTerritoryClick, selectedTerritory }: GameBoardProps) {
  const territories = state.territories;

  const territoryPositions = {
    1: { x: 50, y: 50 },
    2: { x: 250, y: 50 },
    3: { x: 450, y: 50 },
    4: { x: 50, y: 250 },
    5: { x: 250, y: 250 },
    6: { x: 450, y: 250 }
  };

  const connections = [
    [1, 2], [2, 3], [1, 4], [2, 5], [3, 6], [4, 5], [5, 6]
  ];

  return (
    <svg width="600" height="400" style={{ border: '2px solid #333', backgroundColor: '#2a2a2a' }}>
      {/* Draw connections */}
      {connections.map(([from, to]) => {
        const fromPos = territoryPositions[from as TerritoryId];
        const toPos = territoryPositions[to as TerritoryId];
        return (
          <line
            key={`${from}-${to}`}
            x1={fromPos.x + 75}
            y1={fromPos.y + 75}
            x2={toPos.x + 75}
            y2={toPos.y + 75}
            stroke="#555"
            strokeWidth="2"
          />
        );
      })}

      {/* Draw territories */}
      {Object.values(territories).map((territory) => {
        const pos = territoryPositions[territory.id];
        const isSelected = selectedTerritory === territory.id;
        const color = territory.owner === 'red' ? '#e74c3c' : '#3498db';

        return (
          <g
            key={territory.id}
            onClick={() => onTerritoryClick(territory.id)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x}
              y={pos.y}
              width="150"
              height="150"
              fill={color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 4 : 2}
              opacity={0.8}
            />
            <text
              x={pos.x + 75}
              y={pos.y + 65}
              textAnchor="middle"
              fill="white"
              fontSize="24"
              fontWeight="bold"
            >
              {territory.id}
            </text>
            <text
              x={pos.x + 75}
              y={pos.y + 100}
              textAnchor="middle"
              fill="white"
              fontSize="32"
              fontWeight="bold"
            >
              {territory.troops}
            </text>
            <text
              x={pos.x + 75}
              y={pos.y + 125}
              textAnchor="middle"
              fill="white"
              fontSize="14"
            >
              troops
            </text>
          </g>
        );
      })}
    </svg>
  );
}
