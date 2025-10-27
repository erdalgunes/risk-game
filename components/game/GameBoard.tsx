'use client';

import { useState } from 'react';
import { useGameState } from '@/lib/hooks/useGameState';
import { startGame, placeArmies, attackTerritory, fortifyTerritory } from '@/app/actions/game';
import { areTerritoriesAdjacent } from '@/constants/map';
import { PlayersList } from './PlayersList';
import { TerritoriesList } from './TerritoriesList';
import { GameControls } from './GameControls';
import type { Territory, AttackResult } from '@/types/game';
import { useToast } from '@/lib/hooks/useToast';

interface GameBoardProps {
  gameId: string;
  playerId?: string;
}

export function GameBoard({ gameId, playerId }: GameBoardProps) {
  const { game, players, territories, currentPlayer, loading, error } =
    useGameState(gameId);
  const { addToast } = useToast();
  const [starting, setStarting] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [armyCount, setArmyCount] = useState(1);
  const [placing, setPlacing] = useState(false);

  // Attack mode
  const [attackFrom, setAttackFrom] = useState<Territory | null>(null);
  const [attackTo, setAttackTo] = useState<Territory | null>(null);
  const [attacking, setAttacking] = useState(false);
  const [attackResult, setAttackResult] = useState<AttackResult | null>(null);

  // Fortify mode
  const [fortifyFrom, setFortifyFrom] = useState<Territory | null>(null);
  const [fortifyTo, setFortifyTo] = useState<Territory | null>(null);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [fortifying, setFortifying] = useState(false);

  const currentPlayerData = players.find((p) => p.id === playerId);

  async function handleStartGame() {
    setStarting(true);
    try {
      const result = await startGame(gameId);
      if (!result.success) {
        addToast(result.error || 'Failed to start game', 'error');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      addToast('Failed to start game', 'error');
    } finally {
      setStarting(false);
    }
  }

  function handleTerritoryClick(territory: Territory) {
    // Attack mode during attack phase
    if (game?.phase === 'attack' && currentPlayerData?.turn_order === game.current_player_order) {
      handleAttackTerritoryClick(territory);
    } else if (game?.phase === 'fortify' && currentPlayerData?.turn_order === game.current_player_order) {
      // Fortify mode during fortify phase
      handleFortifyTerritoryClick(territory);
    } else {
      // Army placement mode
      setSelectedTerritory(territory);
      setArmyCount(1);
    }
  }

  function handleAttackTerritoryClick(territory: Territory) {
    if (!attackFrom) {
      // First click: select attacking territory (must be yours with 2+ armies)
      if (territory.owner_id === playerId && territory.army_count >= 2) {
        setAttackFrom(territory);
      }
    } else {
      // Second click: select target territory
      if (territory.owner_id !== playerId && areTerritoriesAdjacent(attackFrom.territory_name, territory.territory_name)) {
        setAttackTo(territory);
      } else if (territory.id === attackFrom.id) {
        // Click same territory to cancel
        setAttackFrom(null);
      }
    }
  }

  function handleFortifyTerritoryClick(territory: Territory) {
    if (!fortifyFrom) {
      // First click: select source territory (must be yours with 2+ armies)
      if (territory.owner_id === playerId && territory.army_count >= 2) {
        setFortifyFrom(territory);
        setFortifyCount(1);
      }
    } else {
      // Second click: select destination territory (must be yours)
      if (territory.owner_id === playerId && territory.id !== fortifyFrom.id) {
        setFortifyTo(territory);
      } else if (territory.id === fortifyFrom.id) {
        // Click same territory to cancel
        setFortifyFrom(null);
        setFortifyTo(null);
      }
    }
  }

  async function handleAttack() {
    if (!attackFrom || !attackTo || !playerId) return;

    setAttacking(true);
    try {
      const result = await attackTerritory(gameId, playerId, attackFrom.id, attackTo.id);
      if (!result.success) {
        addToast(result.error || 'Failed to attack', 'error');
      } else {
        setAttackResult(result.result || null);
        // Clear attack selection after showing result
        setTimeout(() => {
          setAttackFrom(null);
          setAttackTo(null);
          setAttackResult(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error attacking:', error);
      addToast('Failed to attack', 'error');
    } finally {
      setAttacking(false);
    }
  }

  async function handlePlaceArmies() {
    if (!selectedTerritory || !playerId || !currentPlayerData) return;

    setPlacing(true);
    try {
      const result = await placeArmies(
        gameId,
        playerId,
        selectedTerritory.id,
        armyCount
      );
      if (!result.success) {
        addToast(result.error || 'Failed to place armies', 'error');
      } else {
        setSelectedTerritory(null);
        setArmyCount(1);
      }
    } catch (error) {
      console.error('Error placing armies:', error);
      addToast('Failed to place armies', 'error');
    } finally {
      setPlacing(false);
    }
  }

  async function handleFortify() {
    if (!fortifyFrom || !fortifyTo || !playerId) return;

    setFortifying(true);
    try {
      const result = await fortifyTerritory(
        gameId,
        playerId,
        fortifyFrom.id,
        fortifyTo.id,
        fortifyCount
      );
      if (!result.success) {
        addToast(result.error || 'Failed to fortify', 'error');
      } else {
        // Clear fortify selection
        setFortifyFrom(null);
        setFortifyTo(null);
        setFortifyCount(1);
      }
    } catch (error) {
      console.error('Error fortifying:', error);
      addToast('Failed to fortify', 'error');
    } finally {
      setFortifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white text-lg">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500">
          <p className="text-xl">Error loading game</p>
          <p className="text-sm mt-2">{error?.message || 'Game not found'}</p>
        </div>
      </div>
    );
  }

  // Victory Screen
  if (game.status === 'finished') {
    const winner = players.find((p) => p.id === game.winner_id);
    const winnerTerritories = territories.filter((t) => t.owner_id === game.winner_id);

    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-lg p-8 max-w-2xl w-full border-4 border-yellow-600 shadow-2xl">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-white mb-4">
                Victory!
              </h1>
              <div className="text-8xl mb-6">🏆</div>

              {winner && (
                <div className="mb-8">
                  <p className="text-2xl text-gray-200 mb-2">Winner</p>
                  <p
                    className="text-5xl font-bold capitalize mb-4"
                    style={{ color: winner.color }}
                  >
                    {winner.username}
                  </p>
                </div>
              )}

              <div className="bg-black bg-opacity-30 rounded-lg p-6 mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">Final Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-lg">
                  <div className="text-right text-gray-300">Total Turns:</div>
                  <div className="text-left text-white font-bold">{game.current_turn}</div>

                  <div className="text-right text-gray-300">Territories Conquered:</div>
                  <div className="text-left text-white font-bold">{winnerTerritories.length}/42</div>

                  <div className="text-right text-gray-300">Total Armies:</div>
                  <div className="text-left text-white font-bold">
                    {winnerTerritories.reduce((sum, t) => sum + t.army_count, 0)}
                  </div>

                  <div className="text-right text-gray-300">Players:</div>
                  <div className="text-left text-white font-bold">{players.length}</div>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href="/"
                  className="block w-full px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xl transition text-white"
                >
                  Return to Lobby
                </a>
                <a
                  href={`/game/${gameId}`}
                  className="block w-full px-8 py-4 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition text-white"
                >
                  View Final Board
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-4 border border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Risk Game
            </h1>
            <p className="text-gray-400">
              Game ID: {gameId.slice(0, 8)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Status</p>
            <p className="text-xl font-bold text-white capitalize">{game.status}</p>
            {game.phase && (
              <p className="text-sm text-gray-400 capitalize">
                Phase: {game.phase}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Start Game Button */}
      {game.status === 'waiting' && (
        <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-lg p-6 mb-4 border border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                Waiting for Players
              </h3>
              <p className="text-gray-300">
                {players.length} / {game.max_players} players joined
              </p>
              {players.length < 2 && (
                <p className="text-sm text-yellow-300 mt-2">
                  Need at least 2 players to start
                </p>
              )}
            </div>
            <button
              onClick={handleStartGame}
              disabled={players.length < 2 || starting}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition text-white"
            >
              {starting ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current Turn Indicator */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Current Turn</p>
                <p className="text-xl font-bold text-white">
                  {currentPlayer?.username || 'Waiting...'}
                </p>
                <p className="text-sm text-gray-400">
                  Turn #{game.current_turn + 1}
                </p>
              </div>
              {currentPlayerData?.id === currentPlayer?.id && (
                <div className="bg-green-600 px-4 py-2 rounded-lg">
                  <p className="font-semibold text-white">Your Turn</p>
                </div>
              )}
            </div>
          </div>

          {/* Game Controls */}
          <GameControls
            game={game}
            currentPlayerData={currentPlayerData}
            territories={territories}
            gameId={gameId}
            playerId={playerId}
          />

          {/* Territories List */}
          <TerritoriesList
            territories={territories}
            players={players}
            currentPlayerId={playerId}
            game={game}
            currentPlayer={currentPlayer}
            onTerritoryClick={handleTerritoryClick}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Players List */}
          <PlayersList
            players={players}
            currentPlayer={currentPlayer}
            yourPlayerId={playerId}
          />

          {/* Your Info */}
          {currentPlayerData && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-3">Your Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-semibold">
                    {currentPlayerData.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Color:</span>
                  <span
                    className="font-semibold capitalize"
                    style={{ color: currentPlayerData.color }}
                  >
                    {currentPlayerData.color}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Armies Available:</span>
                  <span className="text-white font-bold">
                    {currentPlayerData.armies_available}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Territories:</span>
                  <span className="text-white font-bold">
                    {territories.filter((t) => t.owner_id === currentPlayerData.id).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Army Placement Modal */}
      {selectedTerritory && currentPlayerData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Place Armies</h3>
            <p className="text-gray-300 mb-4">
              Territory: <span className="font-semibold capitalize text-white">
                {selectedTerritory.territory_name.replace(/-/g, ' ')}
              </span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Number of armies (Available: {currentPlayerData.armies_available})
              </label>
              <input
                type="number"
                min="1"
                max={currentPlayerData.armies_available}
                value={armyCount}
                onChange={(e) => setArmyCount(Math.max(1, Math.min(currentPlayerData.armies_available, Number(e.target.value))))}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePlaceArmies}
                disabled={placing || armyCount < 1}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
              >
                {placing ? 'Placing...' : `Place ${armyCount} ${armyCount === 1 ? 'Army' : 'Armies'}`}
              </button>
              <button
                onClick={() => setSelectedTerritory(null)}
                disabled={placing}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed rounded font-semibold transition text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attack Modal */}
      {game?.phase === 'attack' && (attackFrom || attackTo || attackResult) && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Attack</h3>

            {!attackResult && (
              <>
                <div className="space-y-3 mb-6">
                  <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                    <p className="text-sm text-gray-300">From:</p>
                    <p className="text-white font-semibold capitalize">
                      {attackFrom ? attackFrom.territory_name.replace(/-/g, ' ') : 'Select your territory (2+ armies)'}
                    </p>
                    {attackFrom && (
                      <p className="text-sm text-gray-400">Armies: {attackFrom.army_count}</p>
                    )}
                  </div>
                  <div className="bg-red-900 border border-red-600 rounded-lg p-3">
                    <p className="text-sm text-gray-300">To:</p>
                    <p className="text-white font-semibold capitalize">
                      {attackTo ? attackTo.territory_name.replace(/-/g, ' ') : 'Select enemy territory (adjacent)'}
                    </p>
                    {attackTo && (
                      <p className="text-sm text-gray-400">Armies: {attackTo.army_count}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {attackFrom && attackTo && (
                    <button
                      onClick={handleAttack}
                      disabled={attacking}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                    >
                      {attacking ? 'Attacking...' : 'Attack!'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAttackFrom(null);
                      setAttackTo(null);
                    }}
                    disabled={attacking}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {attackResult && (
              <div className="text-center">
                <div className={`text-2xl font-bold mb-4 ${attackResult.conquered ? 'text-green-500' : 'text-yellow-500'}`}>
                  {attackResult.conquered ? '🎉 Victory!' : '⚔️ Battle!'}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                    <p className="text-sm text-gray-300">Attacker</p>
                    <p className="text-white font-bold">Dice: {attackResult.attackerDice.join(', ')}</p>
                    <p className="text-red-400">Lost: {attackResult.attackerLosses}</p>
                  </div>
                  <div className="bg-red-900 border border-red-600 rounded-lg p-3">
                    <p className="text-sm text-gray-300">Defender</p>
                    <p className="text-white font-bold">Dice: {attackResult.defenderDice.join(', ')}</p>
                    <p className="text-red-400">Lost: {attackResult.defenderLosses}</p>
                  </div>
                </div>
                {attackResult.conquered && (
                  <p className="text-green-400 font-semibold">Territory conquered!</p>
                )}
                <p className="text-sm text-gray-400 mt-2">Auto-closing...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fortify Modal */}
      {game?.phase === 'fortify' && (fortifyFrom || fortifyTo) && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Fortify</h3>

            <div className="space-y-3 mb-6">
              <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                <p className="text-sm text-gray-300">From:</p>
                <p className="text-white font-semibold capitalize">
                  {fortifyFrom ? fortifyFrom.territory_name.replace(/-/g, ' ') : 'Select source territory (2+ armies)'}
                </p>
                {fortifyFrom && (
                  <p className="text-sm text-gray-400">Armies: {fortifyFrom.army_count}</p>
                )}
              </div>
              <div className="bg-green-900 border border-green-600 rounded-lg p-3">
                <p className="text-sm text-gray-300">To:</p>
                <p className="text-white font-semibold capitalize">
                  {fortifyTo ? fortifyTo.territory_name.replace(/-/g, ' ') : 'Select destination (your territory)'}
                </p>
                {fortifyTo && (
                  <p className="text-sm text-gray-400">Armies: {fortifyTo.army_count}</p>
                )}
              </div>
            </div>

            {fortifyFrom && fortifyTo && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Armies to move (Max: {fortifyFrom.army_count - 1})
                </label>
                <input
                  type="range"
                  min="1"
                  max={fortifyFrom.army_count - 1}
                  value={fortifyCount}
                  onChange={(e) => setFortifyCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>1</span>
                  <span className="text-white font-bold">{fortifyCount}</span>
                  <span>{fortifyFrom.army_count - 1}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {fortifyFrom && fortifyTo && (
                <button
                  onClick={handleFortify}
                  disabled={fortifying}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white"
                >
                  {fortifying ? 'Moving...' : `Move ${fortifyCount} ${fortifyCount === 1 ? 'Army' : 'Armies'}`}
                </button>
              )}
              <button
                onClick={() => {
                  setFortifyFrom(null);
                  setFortifyTo(null);
                  setFortifyCount(1);
                }}
                disabled={fortifying}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed rounded font-semibold transition text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
