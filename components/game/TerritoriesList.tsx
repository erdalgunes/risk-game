'use client';

import type { Territory, Player, Game } from '@/types/game';
import { CONTINENTS } from '@/constants/map';

interface TerritoriesListProps {
  territories: Territory[];
  players: Player[];
  currentPlayerId?: string;
  game?: Game;
  currentPlayer?: Player | null;
  onTerritoryClick?: (territory: Territory) => void;
}

export function TerritoriesList({
  territories,
  players,
  currentPlayerId,
  game,
  currentPlayer,
  onTerritoryClick,
}: TerritoriesListProps) {
  // Group territories by continent
  const territoryMap = new Map<string, Territory[]>();

  CONTINENTS.forEach((continent) => {
    const continentTerritories = territories.filter(
      (t) => continent.territories.includes(t.territory_name)
    );
    territoryMap.set(continent.name, continentTerritories);
  });

  function getPlayerColor(ownerId: string | null): string {
    if (!ownerId) return '#666666';
    const player = players.find((p) => p.id === ownerId);
    return player?.color || '#666666';
  }

  function getPlayerName(ownerId: string | null): string {
    if (!ownerId) return 'Unclaimed';
    const player = players.find((p) => p.id === ownerId);
    return player?.username || 'Unknown';
  }

  function isClickable(territory: Territory): boolean {
    if (!game || !currentPlayer || !onTerritoryClick) return false;
    if (territory.owner_id !== currentPlayerId) return false;
    if (currentPlayer.armies_available <= 0) return false;

    // Can place during setup or reinforcement
    const canPlace = game.status === 'setup' ||
      (game.status === 'playing' && game.phase === 'reinforcement');

    // Must be your turn
    const isYourTurn = currentPlayer.turn_order === game.current_player_order;

    return canPlace && isYourTurn;
  }

  function handleTerritoryClick(territory: Territory) {
    if (isClickable(territory) && onTerritoryClick) {
      onTerritoryClick(territory);
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-3">Territories</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {CONTINENTS.map((continent) => {
          const continentTerritories = territoryMap.get(continent.name) || [];
          const totalArmies = continentTerritories.reduce(
            (sum, t) => sum + t.army_count,
            0
          );

          return (
            <div key={continent.name} className="border border-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-white capitalize">
                  {continent.name.replace('-', ' ')}
                </h4>
                <span className="text-xs text-gray-400">
                  Bonus: +{continent.bonus} armies
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {continentTerritories.map((territory) => {
                  const isYours = territory.owner_id === currentPlayerId;
                  const clickable = isClickable(territory);
                  return (
                    <div
                      key={territory.id}
                      onClick={() => handleTerritoryClick(territory)}
                      className={`text-xs p-2 rounded transition ${
                        clickable
                          ? 'bg-green-900 border border-green-500 cursor-pointer hover:bg-green-800'
                          : isYours
                          ? 'bg-blue-900 border border-blue-600'
                          : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium capitalize">
                          {territory.territory_name.replace(/-/g, ' ')}
                        </span>
                        <span className="font-bold text-white">
                          {territory.army_count}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getPlayerColor(territory.owner_id) }}
                        />
                        <span className="text-gray-400 text-xs">
                          {getPlayerName(territory.owner_id)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
