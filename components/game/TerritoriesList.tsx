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
    const continentTerritories = territories.filter((t) =>
      continent.territories.includes(t.territory_name)
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
    const canPlace =
      game.status === 'setup' || (game.status === 'playing' && game.phase === 'reinforcement');

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
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-lg font-bold text-white">Territories</h3>
      <div className="max-h-96 space-y-4 overflow-y-auto">
        {CONTINENTS.map((continent) => {
          const continentTerritories = territoryMap.get(continent.name) || [];
          const totalArmies = continentTerritories.reduce((sum, t) => sum + t.army_count, 0);

          return (
            <div key={continent.name} className="rounded-lg border border-gray-700 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-bold capitalize text-white">
                  {continent.name.replace('-', ' ')}
                </h4>
                <span className="text-xs text-gray-400">Bonus: +{continent.bonus} armies</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {continentTerritories.map((territory) => {
                  const isYours = territory.owner_id === currentPlayerId;
                  const clickable = isClickable(territory);
                  return (
                    <div
                      key={territory.id}
                      onClick={() => handleTerritoryClick(territory)}
                      className={`rounded p-2 text-xs transition ${
                        clickable
                          ? 'cursor-pointer border border-green-500 bg-green-900 hover:bg-green-800'
                          : isYours
                            ? 'border border-blue-600 bg-blue-900'
                            : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize text-white">
                          {territory.territory_name.replace(/-/g, ' ')}
                        </span>
                        <span className="font-bold text-white">{territory.army_count}</span>
                      </div>
                      <div className="mt-1 flex items-center space-x-1">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: getPlayerColor(territory.owner_id) }}
                        />
                        <span className="text-xs text-gray-400">
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
