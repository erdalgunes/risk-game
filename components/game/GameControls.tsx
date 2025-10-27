'use client';

import { useState } from 'react';
import { endTurn, changePhase } from '@/app/actions/game';
import type { Game, Territory, Player } from '@/types/game';

interface GameControlsProps {
  game: Game;
  currentPlayerData?: Player;
  territories: Territory[];
  gameId: string;
  playerId?: string;
}

export function GameControls({
  game,
  currentPlayerData,
  territories,
  gameId,
  playerId,
}: GameControlsProps) {
  const [transitioning, setTransitioning] = useState(false);

  async function handleEndTurn() {
    if (!playerId) return;
    setTransitioning(true);
    try {
      const result = await endTurn(gameId, playerId);
      if (!result.success) {
        alert(result.error || 'Failed to end turn');
      }
    } catch (error) {
      console.error('Error ending turn:', error);
      alert('Failed to end turn');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleSkipToFortify() {
    if (!playerId) return;
    setTransitioning(true);
    try {
      const result = await changePhase(gameId, playerId, 'fortify');
      if (!result.success) {
        alert(result.error || 'Failed to change phase');
      }
    } catch (error) {
      console.error('Error changing phase:', error);
      alert('Failed to change phase');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleMoveToAttack() {
    if (!playerId) return;
    setTransitioning(true);
    try {
      const result = await changePhase(gameId, playerId, 'attack');
      if (!result.success) {
        alert(result.error || 'Failed to change phase');
      }
    } catch (error) {
      console.error('Error changing phase:', error);
      alert('Failed to change phase');
    } finally {
      setTransitioning(false);
    }
  }

  if (!currentPlayerData) {
    return null;
  }

  const isYourTurn = currentPlayerData.turn_order === game.current_player_order;

  if (!isYourTurn) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400">Waiting for other players...</p>
      </div>
    );
  }

  if (game.status === 'waiting') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-white text-lg font-semibold mb-2">
          Waiting for players to join
        </p>
        <p className="text-gray-400 text-sm">
          Game will start once all players join
        </p>
      </div>
    );
  }

  if (game.status === 'setup') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Setup Phase</h3>
        <p className="text-gray-300 mb-4">
          Place your initial armies on your territories
        </p>
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
          <p className="text-white font-semibold">
            Armies to place: {currentPlayerData.armies_available}
          </p>
        </div>
        <div className="mt-4 text-sm text-gray-400">
          <p>Click on your territories below to place armies</p>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-4">Your Turn</h3>

      {game.phase === 'reinforcement' && (
        <div>
          <p className="text-gray-300 mb-4">Place your reinforcement armies</p>
          <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 mb-4">
            <p className="text-white font-semibold">
              Armies to place: {currentPlayerData.armies_available}
            </p>
          </div>
          {currentPlayerData.armies_available === 0 && (
            <button
              onClick={handleMoveToAttack}
              disabled={transitioning}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
            >
              Continue to Attack Phase
            </button>
          )}
        </div>
      )}

      {game.phase === 'attack' && (
        <div>
          <p className="text-gray-300 mb-4">Attack enemy territories</p>
          <p className="text-sm text-gray-400 mb-4">
            Click attacking territory, then target territory
          </p>
          <div className="space-y-2">
            <button
              onClick={handleSkipToFortify}
              disabled={transitioning}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
            >
              Skip to Fortify Phase
            </button>
          </div>
        </div>
      )}

      {game.phase === 'fortify' && (
        <div>
          <p className="text-gray-300 mb-4">Fortify your territories</p>
          <p className="text-sm text-gray-400 mb-4">
            Move armies between connected territories (optional)
          </p>
          <div className="space-y-2">
            <button
              onClick={handleEndTurn}
              disabled={transitioning}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
            >
              {transitioning ? 'Ending Turn...' : 'End Turn'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
