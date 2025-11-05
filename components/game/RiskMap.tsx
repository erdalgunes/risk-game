'use client';

import type { Territory, Player, Game } from '@/types/game';

interface RiskMapProps {
  territories: Territory[];
  players: Player[];
  currentPlayerId?: string;
  game?: Game;
  currentPlayer?: Player | null;
  onTerritoryClick?: (territory: Territory) => void;
  selectedTerritoryId?: string;
  highlightAdjacent?: string[];
}

/**
 * RiskMap - Visual map representation of game board
 * TODO: Implement interactive SVG map with territory visualization
 * Currently returns placeholder to fix TypeScript errors
 */
export function RiskMap({
  territories,
  players,
  currentPlayerId,
  game,
  currentPlayer,
  onTerritoryClick,
  selectedTerritoryId,
  highlightAdjacent,
}: RiskMapProps) {
  return (
    <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border border-outline-variant shadow-md3-1">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-headline-small text-surface-on mb-md3-2">
            🗺️ Map View
          </p>
          <p className="text-body-medium text-surface-on opacity-70">
            Interactive map visualization coming soon
          </p>
          <p className="text-body-small text-surface-on opacity-50 mt-md3-4">
            For now, please use the List view to interact with territories
          </p>
        </div>
      </div>
    </div>
  );
}
