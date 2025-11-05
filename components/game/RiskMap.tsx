/**
 * Risk Map Component
 *
 * Interactive map visualization of the Risk game board.
 * Displays territories, ownership, army counts, and handles territory selection.
 *
 * TODO: Full SVG map implementation with territory paths and interactions
 */

'use client';

import type { Game, Player, Territory, TerritoryName } from '@/types/game';

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
 * RiskMap - Interactive game board visualization
 *
 * This is a stub implementation that renders territories as a grid.
 * A full implementation would render an SVG map with proper territory boundaries.
 */
export function RiskMap({
  territories,
  players,
  currentPlayerId,
  game,
  currentPlayer,
  onTerritoryClick,
  selectedTerritoryId,
  highlightAdjacent = [],
}: RiskMapProps) {
  if (!game) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-100 rounded-lg">
        <p className="text-slate-500">Loading map...</p>
      </div>
    );
  }

  // Group territories by continent (simplified)
  const getPlayerColor = (playerId: string | null) => {
    if (!playerId) return 'bg-gray-300';
    const player = players.find(p => p.id === playerId);
    if (!player) return 'bg-gray-300';

    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    };

    return colorMap[player.color] || 'bg-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Game Map</h2>
        <p className="text-sm text-gray-600">
          Click territories to select them. Currently viewing {territories.length} territories.
        </p>
      </div>

      {/* Stub: Grid view of territories */}
      <div className="grid grid-cols-6 gap-2">
        {territories.map((territory) => {
          const isSelected = territory.id === selectedTerritoryId;
          const isHighlighted = highlightAdjacent.includes(territory.territory_name);
          const isOwned = territory.owner_id === currentPlayerId;

          return (
            <button
              key={territory.id}
              onClick={() => onTerritoryClick(territory)}
              className={`
                p-3 rounded text-xs font-medium text-white transition-all
                ${getPlayerColor(territory.owner_id)}
                ${isSelected ? 'ring-4 ring-blue-400' : ''}
                ${isHighlighted ? 'ring-2 ring-yellow-400' : ''}
                ${isOwned ? 'shadow-lg' : 'opacity-70'}
                hover:scale-105 hover:shadow-xl
              `}
              title={territory.territory_name}
            >
              <div className="font-bold text-base">{territory.army_count}</div>
              <div className="truncate text-[10px] mt-1">
                {territory.territory_name.replace(/-/g, ' ')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Map Legend */}
      <div className="mt-6 flex flex-wrap gap-4">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getPlayerColor(player.id)}`} />
            <span className="text-sm font-medium">
              {player.username}
              {player.id === currentPlayerId && ' (You)'}
              {player.is_eliminated && ' (Eliminated)'}
            </span>
          </div>
        ))}
      </div>

      {/* TODO: Implement full SVG map with territory boundaries */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
        <strong>Note:</strong> This is a simplified grid view. A full SVG map implementation with
        proper territory boundaries and interactions is planned for future updates.
      </div>
    </div>
  );
}
