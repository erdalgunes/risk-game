'use client';

import type { GameState, Player } from '@risk-poc/game-engine';

interface GameControlsProps {
  gameState: GameState;
  currentPlayer: Player;
  onEndTurn: () => void;
}

export default function GameControls({ gameState, currentPlayer, onEndTurn }: GameControlsProps) {
  if (gameState.winner) {
    const winner = gameState.players.find((p) => p.id === gameState.winner);
    return (
      <div className="bg-green-900 border-4 border-green-500 rounded-lg p-8 text-center">
        <h2 className="text-3xl font-bold mb-2">🎉 Victory!</h2>
        <p className="text-xl">{winner?.name} has conquered all territories!</p>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Play Again
        </button>
      </div>
    );
  }

  const playerColor = currentPlayer.color === 'red' ? 'bg-red-600' : 'bg-blue-600';
  const phaseText = gameState.phase === 'attack' ? '⚔️ Attack Phase' : '🚚 Fortify Phase';

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">
            Current Player: <span className={`${playerColor} px-3 py-1 rounded`}>{currentPlayer.name}</span>
          </h3>
          <p className="text-gray-400 mt-1">{phaseText}</p>
        </div>

        <button
          onClick={onEndTurn}
          disabled={currentPlayer.isAI}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
        >
          {gameState.phase === 'attack' ? 'Skip to Fortify' : 'End Turn'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-700 rounded p-3">
          <p className="text-gray-400 mb-1">Instructions:</p>
          {gameState.phase === 'attack' ? (
            <p>Select your territory, then click an adjacent enemy territory to attack</p>
          ) : (
            <p>Select your territory, then click another of your territories to move troops</p>
          )}
        </div>

        <div className="bg-gray-700 rounded p-3">
          <p className="text-gray-400 mb-1">Game Mode:</p>
          <p>{gameState.mode === 'single-player' ? '🤖 vs AI' : '👥 Multiplayer'}</p>
        </div>
      </div>
    </div>
  );
}
