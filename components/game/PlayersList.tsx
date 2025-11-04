'use client';

import type { Player } from '@/types/game';

interface PlayersListProps {
  players: Player[];
  currentPlayer: Player | null;
  yourPlayerId?: string;
}

export function PlayersList({
  players,
  currentPlayer,
  yourPlayerId,
}: PlayersListProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-3">Players</h3>
      <div className="space-y-2">
        {players.map((player) => {
          const isCurrentTurn = player.id === currentPlayer?.id;
          const isYou = player.id === yourPlayerId;

          return (
            <div
              key={player.id}
              data-testid={`player-${player.id}`}
              data-player-username={player.username}
              className={`p-3 rounded-lg border ${
                isCurrentTurn
                  ? 'bg-blue-900 border-blue-600'
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="font-semibold text-white" data-testid="player-name">
                    {player.username}
                    {isYou && ' (You)'}
                  </span>
                </div>
                {isCurrentTurn && (
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded text-white">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex gap-4">
                <span>Turn: {player.turn_order + 1}</span>
                <span>Armies: {player.armies_available}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
