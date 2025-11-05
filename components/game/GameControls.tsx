'use client';

import { useState, useEffect } from 'react';
import { endTurn, changePhase } from '@/app/actions/game';
import { undoLastAction, checkUndoAvailability } from '@/app/actions/undo';
import type { Game, Territory, Player } from '@/types/game';
import { useToast } from '@/lib/hooks/useToast';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';

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
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const { addToast } = useToast();

  // Check undo availability when game state changes
  useEffect(() => {
    async function checkUndo() {
      if (!playerId || !gameId) {
        setUndoAvailable(false);
        return;
      }

      try {
        const result = await checkUndoAvailability(gameId, playerId);
        setUndoAvailable(result.available);
      } catch (error) {
        setUndoAvailable(false);
      }
    }

    checkUndo();
  }, [game, playerId, gameId]);

  async function handleUndo() {
    if (!playerId) return;

    setUndoing(true);
    try {
      const result = await undoLastAction(gameId, playerId);
      if (result.success) {
        addToast('Action undone successfully', 'success');
        setUndoAvailable(false);
      } else {
        addToast(result.error || 'Failed to undo action', 'error');
      }
    } catch (error) {
      console.error('Error undoing action:', error);
      addToast('Failed to undo action', 'error');
    } finally {
      setUndoing(false);
    }
  }

  async function handleEndTurn() {
    if (!playerId) return;

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.END_TURN;
    if (!rateLimiter.check('end-turn', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('end-turn');
      addToast(`Too many requests. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

    setTransitioning(true);
    try {
      const result = await endTurn(gameId, playerId);
      if (!result.success) {
        addToast(result.error || 'Failed to end turn', 'error');
      }
    } catch (error) {
      console.error('Error ending turn:', error);
      addToast('Failed to end turn', 'error');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleSkipToFortify() {
    if (!playerId) return;

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.CHANGE_PHASE;
    if (!rateLimiter.check('change-phase', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('change-phase');
      addToast(`Too many requests. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

    setTransitioning(true);
    try {
      const result = await changePhase(gameId, playerId, 'fortify');
      if (!result.success) {
        addToast(result.error || 'Failed to change phase', 'error');
      }
    } catch (error) {
      console.error('Error changing phase:', error);
      addToast('Failed to change phase', 'error');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleMoveToAttack() {
    if (!playerId) return;

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.CHANGE_PHASE;
    if (!rateLimiter.check('change-phase', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('change-phase');
      addToast(`Too many requests. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

    setTransitioning(true);
    try {
      const result = await changePhase(gameId, playerId, 'attack');
      if (!result.success) {
        addToast(result.error || 'Failed to change phase', 'error');
      }
    } catch (error) {
      console.error('Error changing phase:', error);
      addToast('Failed to change phase', 'error');
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
          <div className="space-y-2">
            {undoAvailable && (
              <button
                onClick={handleUndo}
                disabled={undoing || transitioning}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                aria-busy={undoing}
              >
                {undoing ? 'Undoing...' : 'Undo Last Action'}
              </button>
            )}
            {currentPlayerData.armies_available === 0 && (
              <button
                onClick={handleMoveToAttack}
                disabled={transitioning}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                aria-busy={transitioning}
              >
                {transitioning ? 'Changing Phase...' : 'Continue to Attack Phase'}
              </button>
            )}
          </div>
        </div>
      )}

      {game.phase === 'attack' && (
        <div>
          <p className="text-gray-300 mb-4">Attack enemy territories</p>
          <p className="text-sm text-gray-400 mb-4">
            Click attacking territory, then target territory
          </p>
          <div className="space-y-2">
            {undoAvailable && (
              <button
                onClick={handleUndo}
                disabled={undoing || transitioning}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                aria-busy={undoing}
              >
                {undoing ? 'Undoing...' : 'Undo Last Attack'}
              </button>
            )}
            <button
              onClick={handleSkipToFortify}
              disabled={transitioning}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
              aria-busy={transitioning}
            >
              {transitioning ? 'Changing Phase...' : 'Skip to Fortify Phase'}
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
            {undoAvailable && (
              <button
                onClick={handleUndo}
                disabled={undoing || transitioning}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                aria-busy={undoing}
              >
                {undoing ? 'Undoing...' : 'Undo Last Fortify'}
              </button>
            )}
            <button
              onClick={handleEndTurn}
              disabled={transitioning}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
              aria-busy={transitioning}
            >
              {transitioning ? 'Ending Turn...' : 'End Turn'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
