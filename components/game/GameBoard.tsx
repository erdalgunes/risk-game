'use client';

import { useState } from 'react';
import { useGameState } from '@/lib/hooks/useGameState';
import { startGame, placeArmies, attackTerritory, fortifyTerritory } from '@/app/actions/game';
import { areTerritoriesAdjacent } from '@/constants/map';
import { PlayersList } from './PlayersList';
import { TerritoriesList } from './TerritoriesList';
import { RiskMap } from './RiskMap';
import { GameControls } from './GameControls';
import { GameAnnouncer } from './GameAnnouncer';
import { JoinGameModal } from './JoinGameModal';
import type { Territory, AttackResult } from '@/types/game';
import { useToast } from '@/lib/hooks/useToast';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';

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
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list'); // Default to list view

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

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.ATTACK;
    if (!rateLimiter.check('attack', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('attack');
      addToast(`Too many attacks. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

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

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.PLACE_ARMIES;
    if (!rateLimiter.check('place-armies', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('place-armies');
      addToast(`Too many requests. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

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

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.FORTIFY;
    if (!rateLimiter.check('fortify', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('fortify');
      addToast(`Too many fortifications. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

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
      <div className="flex items-center justify-center min-h-screen bg-surface" role="status" aria-live="polite">
        <div className="text-center bg-surface-container-low rounded-md3-lg p-md3-8 border border-outline-variant shadow-md3-2">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-md3-4 mx-auto" aria-hidden="true"></div>
          <p className="text-surface-on text-title-large">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface" role="alert">
        <div className="text-center bg-error-container rounded-md3-lg p-md3-8 border border-error shadow-md3-2">
          <div className="text-6xl mb-md3-4" aria-hidden="true">⚠️</div>
          <p className="text-headline-medium text-error-on-container mb-md3-2">Error loading game</p>
          <p className="text-body-medium text-error-on-container opacity-80">{error?.message || 'Game not found'}</p>
        </div>
      </div>
    );
  }

  // Show join modal if no playerId
  if (!playerId) {
    return <JoinGameModal gameId={gameId} game={game} players={players} />;
  }

  // Victory Screen
  if (game.status === 'finished') {
    const winner = players.find((p) => p.id === game.winner_id);
    const winnerTerritories = territories.filter((t) => t.owner_id === game.winner_id);

    return (
      <div className="container mx-auto p-md3-4 bg-surface min-h-screen flex items-center justify-center" role="main">
        <section
          className="bg-tertiary-container rounded-md3-xl p-md3-10 max-w-2xl w-full border-2 border-tertiary shadow-md3-4 animate-md3-spring-bounce"
          role="alert"
          aria-live="assertive"
          aria-label="Game finished"
        >
          <div className="text-center">
            <h1 className="text-display-large text-tertiary-on-container mb-md3-6">
              Victory!
            </h1>
            <div className="text-8xl mb-md3-8" aria-hidden="true">🏆</div>

            {winner && (
              <div className="mb-md3-10">
                <p className="text-headline-medium text-tertiary-on-container opacity-90 mb-md3-3">Winner</p>
                <p
                  className="text-display-medium font-bold capitalize mb-md3-4 text-tertiary-on-container"
                  role="status"
                >
                  {winner.username}
                </p>
              </div>
            )}

            <div className="bg-surface-container-highest rounded-md3-lg p-md3-6 mb-md3-8 border border-outline shadow-md3-1">
              <h3 className="text-headline-medium text-surface-on mb-md3-4">Final Statistics</h3>
              <div className="grid grid-cols-2 gap-md3-4 text-title-medium">
                <div className="text-right text-surface-on opacity-80">Total Turns:</div>
                <div className="text-left text-surface-on font-bold">{game.current_turn}</div>

                <div className="text-right text-surface-on opacity-80">Territories Conquered:</div>
                <div className="text-left text-surface-on font-bold">{winnerTerritories.length}/42</div>

                <div className="text-right text-surface-on opacity-80">Total Armies:</div>
                <div className="text-left text-surface-on font-bold">
                  {winnerTerritories.reduce((sum, t) => sum + t.army_count, 0)}
                </div>

                <div className="text-right text-surface-on opacity-80">Players:</div>
                <div className="text-left text-surface-on font-bold">{players.length}</div>
              </div>
            </div>

            <div className="space-y-md3-3">
              <a
                href="/"
                className="block w-full px-md3-8 py-md3-4 bg-primary hover:shadow-md3-3 rounded-md3-xl font-bold text-title-large transition-all duration-md3-medium2 text-primary-on active:scale-98"
                aria-label="Return to lobby"
              >
                Return to Lobby
              </a>
              <a
                href={`/game/${gameId}`}
                className="block w-full px-md3-8 py-md3-4 bg-secondary-container hover:shadow-md3-2 rounded-md3-xl font-medium text-label-large transition-all duration-md3-medium2 text-secondary-on-container active:scale-98"
                aria-label="View final game board"
              >
                View Final Board
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-md3-4">
      {/* Screen reader announcer */}
      <GameAnnouncer game={game} currentPlayer={currentPlayerData} players={players} />

      {/* Header */}
      <header className="bg-surface-container-low rounded-md3-lg p-md3-6 mb-md3-4 border border-outline-variant shadow-md3-1">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-display-small text-surface-on mb-md3-2">
              Risk Game
            </h1>
            <p className="text-body-large text-surface-on opacity-60">
              Game ID: {gameId.slice(0, 8)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-label-medium text-surface-on opacity-60">Status</p>
            <p className="text-headline-small text-surface-on capitalize" role="status">{game.status}</p>
            {game.phase && (
              <p className="text-body-medium text-surface-on opacity-70 capitalize" role="status">
                Phase: {game.phase}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Start Game Button */}
      {game.status === 'waiting' && (
        <div className="bg-tertiary-container rounded-md3-lg p-md3-6 mb-md3-4 border border-tertiary shadow-md3-2 animate-md3-spring-bounce">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-headline-medium text-tertiary-on-container mb-md3-2">
                Waiting for Players
              </h3>
              <p className="text-body-large text-tertiary-on-container opacity-90">
                {players.length} / {game.max_players} players joined
              </p>
              {players.length < 2 && (
                <p className="text-body-medium text-error mt-md3-2">
                  Need at least 2 players to start
                </p>
              )}
            </div>
            <button
              onClick={handleStartGame}
              disabled={players.length < 2 || starting}
              className="px-md3-8 py-md3-4 bg-tertiary hover:shadow-md3-3 disabled:bg-surface-variant disabled:text-surface-on-variant disabled:cursor-not-allowed rounded-md3-xl text-label-large font-bold transition-all duration-md3-medium2 text-tertiary-on active:scale-98"
            >
              {starting ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-md3-4">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-md3-4">
          {/* Current Turn Indicator */}
          <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border border-outline-variant shadow-md3-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-medium text-surface-on opacity-60">Current Turn</p>
                <p className="text-headline-medium text-surface-on">
                  {currentPlayer?.username || 'Waiting...'}
                </p>
                <p className="text-body-medium text-surface-on opacity-70">
                  Turn #{game.current_turn + 1}
                </p>
              </div>
              {currentPlayerData?.id === currentPlayer?.id && (
                <div className="bg-tertiary px-md3-4 py-md3-2 rounded-md3-xl shadow-md3-2 animate-md3-spring-bounce">
                  <p className="text-label-large text-tertiary-on">Your Turn</p>
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

          {/* View Toggle */}
          <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border border-outline-variant shadow-md3-1">
            <div className="flex items-center justify-between">
              <h3 className="text-title-large text-surface-on">Board View</h3>
              <div className="flex gap-md3-2 bg-surface-container rounded-md3-xl p-md3-1 border border-outline">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-md3-4 py-md3-2 rounded-md3-lg font-medium text-label-large transition-all duration-md3-short4 ${
                    viewMode === 'map'
                      ? 'bg-secondary-container text-secondary-on-container shadow-md3-1'
                      : 'text-surface-on hover:bg-surface-container-high active:scale-98'
                  }`}
                  aria-label="Map view"
                  aria-pressed={viewMode === 'map'}
                >
                  🗺️ Map
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-md3-4 py-md3-2 rounded-md3-lg font-medium text-label-large transition-all duration-md3-short4 ${
                    viewMode === 'list'
                      ? 'bg-secondary-container text-secondary-on-container shadow-md3-1'
                      : 'text-surface-on hover:bg-surface-container-high active:scale-98'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  📋 List
                </button>
              </div>
            </div>
          </div>

          {/* Territories View (Map or List) */}
          {viewMode === 'map' ? (
            <RiskMap
              territories={territories}
              players={players}
              currentPlayerId={playerId}
              game={game}
              currentPlayer={currentPlayer}
              onTerritoryClick={handleTerritoryClick}
              selectedTerritoryId={selectedTerritory?.id}
              highlightAdjacent={
                // Highlight adjacent territories based on phase
                game?.phase === 'attack' && attackFrom
                  ? territories
                      .filter(
                        (t) =>
                          t.owner_id !== playerId &&
                          areTerritoriesAdjacent(attackFrom.territory_name, t.territory_name)
                      )
                      .map((t) => t.territory_name)
                  : game?.phase === 'fortify' && fortifyFrom
                  ? territories
                      .filter(
                        (t) =>
                          t.owner_id === playerId &&
                          t.id !== fortifyFrom.id &&
                          areTerritoriesAdjacent(fortifyFrom.territory_name, t.territory_name)
                      )
                      .map((t) => t.territory_name)
                  : []
              }
            />
          ) : (
            <TerritoriesList
              territories={territories}
              players={players}
              currentPlayerId={playerId}
              game={game}
              currentPlayer={currentPlayer}
              onTerritoryClick={handleTerritoryClick}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-md3-4">
          {/* Players List */}
          <PlayersList
            players={players}
            currentPlayer={currentPlayer}
            yourPlayerId={playerId}
          />

          {/* Your Info */}
          {currentPlayerData && (
            <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border border-outline-variant shadow-md3-1">
              <h3 className="text-title-large text-surface-on mb-md3-3">Your Info</h3>
              <div className="space-y-md3-3">
                <div className="flex justify-between items-center p-md3-2 bg-surface-container rounded-md3-sm">
                  <span className="text-body-medium text-surface-on opacity-70">Name:</span>
                  <span className="text-title-medium text-surface-on font-semibold">
                    {currentPlayerData.username}
                  </span>
                </div>
                <div className="flex justify-between items-center p-md3-2 bg-surface-container rounded-md3-sm">
                  <span className="text-body-medium text-surface-on opacity-70">Color:</span>
                  <div className="flex items-center gap-md3-2">
                    <div
                      className="w-4 h-4 rounded-full shadow-md3-1"
                      style={{ backgroundColor: currentPlayerData.color }}
                    />
                    <span className="text-title-medium text-surface-on font-semibold capitalize">
                      {currentPlayerData.color}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-md3-2 bg-primary-container rounded-md3-sm border border-primary">
                  <span className="text-body-medium text-primary-on-container opacity-80">Armies Available:</span>
                  <span className="text-title-medium text-primary-on-container font-bold">
                    {currentPlayerData.armies_available}
                  </span>
                </div>
                <div className="flex justify-between items-center p-md3-2 bg-surface-container rounded-md3-sm">
                  <span className="text-body-medium text-surface-on opacity-70">Territories:</span>
                  <span className="text-title-medium text-surface-on font-bold">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-md3-fade-in">
          <div className="bg-surface-container-high rounded-md3-xl p-md3-6 max-w-md w-full mx-md3-4 border border-outline shadow-md3-5 animate-md3-spring-bounce">
            <h3 className="text-headline-medium text-surface-on mb-md3-4">Place Armies</h3>
            <div className="bg-primary-container rounded-md3-md p-md3-3 mb-md3-4 border border-primary">
              <p className="text-label-medium text-primary-on-container opacity-80 mb-md3-1">Territory</p>
              <p className="text-title-large text-primary-on-container font-semibold capitalize">
                {selectedTerritory.territory_name.replace(/-/g, ' ')}
              </p>
            </div>
            <div className="mb-md3-6">
              <label className="block text-label-large text-surface-on mb-md3-2">
                Number of armies
              </label>
              <p className="text-body-small text-surface-on opacity-70 mb-md3-3">
                Available: {currentPlayerData.armies_available}
              </p>
              <input
                type="number"
                min="1"
                max={currentPlayerData.armies_available}
                value={armyCount}
                onChange={(e) => setArmyCount(Math.max(1, Math.min(currentPlayerData.armies_available, Number(e.target.value))))}
                className="w-full px-md3-4 py-md3-3 rounded-md3-md bg-surface-container border-2 border-outline text-surface-on focus:outline-none focus:border-primary transition-colors duration-md3-short4 text-body-large"
              />
            </div>
            <div className="flex gap-md3-3">
              <button
                onClick={handlePlaceArmies}
                disabled={placing || armyCount < 1}
                className="flex-1 px-md3-6 py-md3-3 bg-primary hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant disabled:cursor-not-allowed rounded-md3-xl font-medium text-label-large transition-all duration-md3-medium2 text-primary-on active:scale-98"
              >
                {placing ? 'Placing...' : `Place ${armyCount} ${armyCount === 1 ? 'Army' : 'Armies'}`}
              </button>
              <button
                onClick={() => setSelectedTerritory(null)}
                disabled={placing}
                className="flex-1 px-md3-6 py-md3-3 bg-surface-container-highest hover:shadow-md3-1 disabled:cursor-not-allowed rounded-md3-xl font-medium text-label-large transition-all duration-md3-medium2 text-surface-on active:scale-98"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attack Modal */}
      {game?.phase === 'attack' && (attackFrom || attackTo || attackResult) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-md3-fade-in">
          <div className="bg-surface-container-high rounded-md3-xl p-md3-6 max-w-md w-full mx-md3-4 border border-outline shadow-md3-5 animate-md3-spring-bounce">
            <h3 className="text-headline-medium text-surface-on mb-md3-4">Attack</h3>

            {!attackResult && (
              <>
                <div className="space-y-md3-3 mb-md3-6">
                  <div className="bg-primary-container border-2 border-primary rounded-md3-md p-md3-3">
                    <p className="text-label-small text-primary-on-container opacity-70 mb-md3-1">From:</p>
                    <p className="text-title-medium text-primary-on-container font-semibold capitalize">
                      {attackFrom ? attackFrom.territory_name.replace(/-/g, ' ') : 'Select your territory (2+ armies)'}
                    </p>
                    {attackFrom && (
                      <p className="text-body-small text-primary-on-container opacity-80 mt-md3-1">Armies: {attackFrom.army_count}</p>
                    )}
                  </div>
                  <div className="bg-error-container border-2 border-error rounded-md3-md p-md3-3">
                    <p className="text-label-small text-error-on-container opacity-70 mb-md3-1">To:</p>
                    <p className="text-title-medium text-error-on-container font-semibold capitalize">
                      {attackTo ? attackTo.territory_name.replace(/-/g, ' ') : 'Select enemy territory (adjacent)'}
                    </p>
                    {attackTo && (
                      <p className="text-body-small text-error-on-container opacity-80 mt-md3-1">Armies: {attackTo.army_count}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-md3-3">
                  {attackFrom && attackTo && (
                    <button
                      onClick={handleAttack}
                      disabled={attacking}
                      className="flex-1 px-md3-6 py-md3-3 bg-error hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant disabled:cursor-not-allowed rounded-md3-xl font-bold text-label-large transition-all duration-md3-medium2 text-error-on active:scale-98"
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
                    className="flex-1 px-md3-6 py-md3-3 bg-surface-container-highest hover:shadow-md3-1 disabled:cursor-not-allowed rounded-md3-xl font-medium text-label-large transition-all duration-md3-medium2 text-surface-on active:scale-98"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {attackResult && (
              <div className="text-center">
                <div className={`text-display-small font-bold mb-md3-6 ${attackResult.conquered ? 'text-tertiary' : 'text-secondary'}`}>
                  {attackResult.conquered ? '🎉 Victory!' : '⚔️ Battle!'}
                </div>
                <div className="grid grid-cols-2 gap-md3-4 mb-md3-4">
                  <div className="bg-primary-container border border-primary rounded-md3-md p-md3-3">
                    <p className="text-label-medium text-primary-on-container opacity-80 mb-md3-2">Attacker</p>
                    <p className="text-title-medium text-primary-on-container font-bold mb-md3-1">Dice: {attackResult.attackerDice.join(', ')}</p>
                    <p className="text-label-large text-error font-semibold">Lost: {attackResult.attackerLosses}</p>
                  </div>
                  <div className="bg-error-container border border-error rounded-md3-md p-md3-3">
                    <p className="text-label-medium text-error-on-container opacity-80 mb-md3-2">Defender</p>
                    <p className="text-title-medium text-error-on-container font-bold mb-md3-1">Dice: {attackResult.defenderDice.join(', ')}</p>
                    <p className="text-label-large text-error font-semibold">Lost: {attackResult.defenderLosses}</p>
                  </div>
                </div>
                {attackResult.conquered && (
                  <div className="bg-tertiary-container rounded-md3-md p-md3-3 mb-md3-3 border border-tertiary">
                    <p className="text-title-medium text-tertiary-on-container font-bold">Territory conquered!</p>
                  </div>
                )}
                <p className="text-body-small text-surface-on opacity-60">Auto-closing...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fortify Modal */}
      {game?.phase === 'fortify' && (fortifyFrom || fortifyTo) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-md3-fade-in">
          <div className="bg-surface-container-high rounded-md3-xl p-md3-6 max-w-md w-full mx-md3-4 border border-outline shadow-md3-5 animate-md3-spring-bounce">
            <h3 className="text-headline-medium text-surface-on mb-md3-4">Fortify</h3>

            <div className="space-y-md3-3 mb-md3-6">
              <div className="bg-primary-container border-2 border-primary rounded-md3-md p-md3-3">
                <p className="text-label-small text-primary-on-container opacity-70 mb-md3-1">From:</p>
                <p className="text-title-medium text-primary-on-container font-semibold capitalize">
                  {fortifyFrom ? fortifyFrom.territory_name.replace(/-/g, ' ') : 'Select source territory (2+ armies)'}
                </p>
                {fortifyFrom && (
                  <p className="text-body-small text-primary-on-container opacity-80 mt-md3-1">Armies: {fortifyFrom.army_count}</p>
                )}
              </div>
              <div className="bg-tertiary-container border-2 border-tertiary rounded-md3-md p-md3-3">
                <p className="text-label-small text-tertiary-on-container opacity-70 mb-md3-1">To:</p>
                <p className="text-title-medium text-tertiary-on-container font-semibold capitalize">
                  {fortifyTo ? fortifyTo.territory_name.replace(/-/g, ' ') : 'Select destination (your territory)'}
                </p>
                {fortifyTo && (
                  <p className="text-body-small text-tertiary-on-container opacity-80 mt-md3-1">Armies: {fortifyTo.army_count}</p>
                )}
              </div>
            </div>

            {fortifyFrom && fortifyTo && (
              <div className="mb-md3-6">
                <label className="block text-label-large text-surface-on mb-md3-2">
                  Armies to move
                </label>
                <p className="text-body-small text-surface-on opacity-70 mb-md3-3">
                  Max: {fortifyFrom.army_count - 1}
                </p>
                <input
                  type="range"
                  min="1"
                  max={fortifyFrom.army_count - 1}
                  value={fortifyCount}
                  onChange={(e) => setFortifyCount(Number(e.target.value))}
                  className="w-full h-2 bg-surface-container rounded-md3-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-body-small text-surface-on opacity-70 mt-md3-2">
                  <span>1</span>
                  <span className="text-primary text-title-large font-bold">{fortifyCount}</span>
                  <span>{fortifyFrom.army_count - 1}</span>
                </div>
              </div>
            )}

            <div className="flex gap-md3-3">
              {fortifyFrom && fortifyTo && (
                <button
                  onClick={handleFortify}
                  disabled={fortifying}
                  className="flex-1 px-md3-6 py-md3-3 bg-tertiary hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant disabled:cursor-not-allowed rounded-md3-xl font-bold text-label-large transition-all duration-md3-medium2 text-tertiary-on active:scale-98"
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
                className="flex-1 px-md3-6 py-md3-3 bg-surface-container-highest hover:shadow-md3-1 disabled:cursor-not-allowed rounded-md3-xl font-medium text-label-large transition-all duration-md3-medium2 text-surface-on active:scale-98"
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
