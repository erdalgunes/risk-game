'use client';

import type { Player } from '@/types/game';

interface PlayersListProps {
  players: Player[];
  currentPlayer: Player | null;
  yourPlayerId?: string;
}

export function PlayersList({ players, currentPlayer, yourPlayerId }: PlayersListProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-lg font-bold text-white">Players</h3>
      <div className="space-y-2">
        {players.map((player) => {
          const isCurrentTurn = player.id === currentPlayer?.id;
          const isYou = player.id === yourPlayerId;

          return (
            <div
              key={player.id}
              data-testid={`player-${player.id}`}
              data-player-username={player.username}
              className={`rounded-lg border p-3 ${
                isCurrentTurn ? 'border-blue-600 bg-blue-900' : 'border-gray-600 bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: player.color }} />
                  <span className="font-semibold text-white" data-testid="player-name">
                    {player.username}
                    {isYou && ' (You)'}
                  </span>
                </div>
                {isCurrentTurn && (
                  <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Active</span>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
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
