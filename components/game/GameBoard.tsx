'use client';

import { useState, useEffect, useRef } from 'react';
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
import { AIPlayer } from '@/lib/ai/AIPlayer';
import { isAIPlayer } from '@/lib/ai/utils';

interface GameBoardProps {
  gameId: string;
  playerId?: string;
}

export function GameBoard({ gameId, playerId }: GameBoardProps) {
  const { game, players, territories, currentPlayer, loading, error } = useGameState(gameId);
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

  // AI turn state
  const [aiThinking, setAiThinking] = useState(false);
  const aiExecutingRef = useRef(false);

  const currentPlayerData = players.find((p) => p.id === playerId);

  // AI Turn Execution
  useEffect(() => {
    const executeAITurn = async () => {
      // Guard conditions
      if (!game || !currentPlayer || !territories.length || !players.length) return;
      if (game.status !== 'setup' && game.status !== 'playing') return;
      if (aiExecutingRef.current) return;

      // Check if current player is AI
      const isAI = isAIPlayer(currentPlayer.username);
      if (!isAI) {
        setAiThinking(false);
        return;
      }

      // Execute AI turn
      try {
        setAiThinking(true);
        aiExecutingRef.current = true;

        const aiPlayer = new AIPlayer(currentPlayer.id, game.id, 'easy');
        await aiPlayer.executeTurn(game, currentPlayer, players, territories);
      } catch (error) {
        console.error('[AI] Error executing turn:', error);
      } finally {
        setAiThinking(false);
        aiExecutingRef.current = false;
      }
    };

    executeAITurn();
  }, [game?.phase, game?.current_player_order, game?.status, currentPlayer?.id, territories.length]);

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
    } else if (
      game?.phase === 'fortify' &&
      currentPlayerData?.turn_order === game.current_player_order
    ) {
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
      if (
        territory.owner_id !== playerId &&
        areTerritoriesAdjacent(attackFrom.territory_name, territory.territory_name)
      ) {
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
      const result = await placeArmies(gameId, playerId, selectedTerritory.id, armyCount);
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
      <div
        className="bg-surface flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="bg-surface-container-low rounded-md3-lg p-md3-8 border-outline-variant shadow-md3-2 border text-center">
          <div
            className="border-primary mb-md3-4 mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
            aria-hidden="true"
          ></div>
          <p className="text-surface-on text-title-large">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="bg-surface flex min-h-screen items-center justify-center" role="alert">
        <div className="bg-error-container rounded-md3-lg p-md3-8 border-error shadow-md3-2 border text-center">
          <div className="mb-md3-4 text-6xl" aria-hidden="true">
            ⚠️
          </div>
          <p className="text-headline-medium text-error-on-container mb-md3-2">
            Error loading game
          </p>
          <p className="text-body-medium text-error-on-container opacity-80">
            {error?.message || 'Game not found'}
          </p>
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
      <div
        className="p-md3-4 bg-surface container mx-auto flex min-h-screen items-center justify-center"
        role="main"
      >
        <section
          className="bg-tertiary-container rounded-md3-xl p-md3-10 border-tertiary shadow-md3-4 animate-md3-spring-bounce w-full max-w-2xl border-2"
          role="alert"
          aria-live="assertive"
          aria-label="Game finished"
        >
          <div className="text-center">
            <h1 className="text-display-large text-tertiary-on-container mb-md3-6">Victory!</h1>
            <div className="mb-md3-8 text-8xl" aria-hidden="true">
              🏆
            </div>

            {winner && (
              <div className="mb-md3-10">
                <p className="text-headline-medium text-tertiary-on-container mb-md3-3 opacity-90">
                  Winner
                </p>
                <p
                  className="text-display-medium mb-md3-4 text-tertiary-on-container font-bold capitalize"
                  role="status"
                >
                  {winner.username}
                </p>
              </div>
            )}

            <div className="bg-surface-container-highest rounded-md3-lg p-md3-6 mb-md3-8 border-outline shadow-md3-1 border">
              <h3 className="text-headline-medium text-surface-on mb-md3-4">Final Statistics</h3>
              <div className="gap-md3-4 text-title-medium grid grid-cols-2">
                <div className="text-surface-on text-right opacity-80">Total Turns:</div>
                <div className="text-surface-on text-left font-bold">{game.current_turn}</div>

                <div className="text-surface-on text-right opacity-80">Territories Conquered:</div>
                <div className="text-surface-on text-left font-bold">
                  {winnerTerritories.length}/42
                </div>

                <div className="text-surface-on text-right opacity-80">Total Armies:</div>
                <div className="text-surface-on text-left font-bold">
                  {winnerTerritories.reduce((sum, t) => sum + t.army_count, 0)}
                </div>

                <div className="text-surface-on text-right opacity-80">Players:</div>
                <div className="text-surface-on text-left font-bold">{players.length}</div>
              </div>
            </div>

            <div className="space-y-md3-3">
              <a
                href="/"
                className="px-md3-8 py-md3-4 bg-primary hover:shadow-md3-3 rounded-md3-xl text-title-large duration-md3-medium2 text-primary-on active:scale-98 block w-full font-bold transition-all"
                aria-label="Return to lobby"
              >
                Return to Lobby
              </a>
              <a
                href={`/game/${gameId}`}
                className="px-md3-8 py-md3-4 bg-secondary-container hover:shadow-md3-2 rounded-md3-xl text-label-large duration-md3-medium2 text-secondary-on-container active:scale-98 block w-full font-medium transition-all"
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
    <div className="p-md3-4 container mx-auto">
      {/* Screen reader announcer */}
      <GameAnnouncer game={game} currentPlayer={currentPlayerData} players={players} />

      {/* Header */}
      <header className="bg-surface-container-low rounded-md3-lg p-md3-6 mb-md3-4 border-outline-variant shadow-md3-1 border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-small text-surface-on mb-md3-2">Risk Game</h1>
            <p className="text-body-large text-surface-on opacity-60">
              Game ID: {gameId.slice(0, 8)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-label-medium text-surface-on opacity-60">Status</p>
            <p className="text-headline-small text-surface-on capitalize" role="status">
              {game.status}
            </p>
            {game.phase && (
              <p className="text-body-medium text-surface-on capitalize opacity-70" role="status">
                Phase: {game.phase}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Start Game Button */}
      {game.status === 'waiting' && (
        <div className="bg-tertiary-container rounded-md3-lg p-md3-6 mb-md3-4 border-tertiary shadow-md3-2 animate-md3-spring-bounce border">
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
              className="px-md3-8 py-md3-4 bg-tertiary hover:shadow-md3-3 disabled:bg-surface-variant disabled:text-surface-on-variant rounded-md3-xl text-label-large duration-md3-medium2 text-tertiary-on active:scale-98 font-bold transition-all disabled:cursor-not-allowed"
            >
              {starting ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        </div>
      )}

      <div className="gap-md3-4 grid lg:grid-cols-3">
        {/* Main Game Area */}
        <div className="space-y-md3-4 lg:col-span-2">
          {/* Current Turn Indicator */}
          <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border-outline-variant shadow-md3-1 border">
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
              {aiThinking && currentPlayer && isAIPlayer(currentPlayer.username) && (
                <div className="bg-secondary-container px-md3-4 py-md3-2 rounded-md3-xl shadow-md3-2 animate-pulse">
                  <p className="text-label-large text-secondary-on-container">🤖 AI Thinking...</p>
                </div>
              )}
              {!aiThinking && currentPlayerData?.id === currentPlayer?.id && (
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
          <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border-outline-variant shadow-md3-1 border">
            <div className="flex items-center justify-between">
              <h3 className="text-title-large text-surface-on">Board View</h3>
              <div className="gap-md3-2 bg-surface-container rounded-md3-xl p-md3-1 border-outline flex border">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-md3-4 py-md3-2 rounded-md3-lg text-label-large duration-md3-short4 font-medium transition-all ${
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
                  className={`px-md3-4 py-md3-2 rounded-md3-lg text-label-large duration-md3-short4 font-medium transition-all ${
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
              currentPlayer={currentPlayer ?? undefined}
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
          <PlayersList players={players} currentPlayer={currentPlayer} yourPlayerId={playerId} />

          {/* Your Info */}
          {currentPlayerData && (
            <div className="bg-surface-container-low rounded-md3-lg p-md3-4 border-outline-variant shadow-md3-1 border">
              <h3 className="text-title-large text-surface-on mb-md3-3">Your Info</h3>
              <div className="space-y-md3-3">
                <div className="p-md3-2 bg-surface-container rounded-md3-sm flex items-center justify-between">
                  <span className="text-body-medium text-surface-on opacity-70">Name:</span>
                  <span className="text-title-medium text-surface-on font-semibold">
                    {currentPlayerData.username}
                  </span>
                </div>
                <div className="p-md3-2 bg-surface-container rounded-md3-sm flex items-center justify-between">
                  <span className="text-body-medium text-surface-on opacity-70">Color:</span>
                  <div className="gap-md3-2 flex items-center">
                    <div
                      className="shadow-md3-1 h-4 w-4 rounded-full"
                      style={{ backgroundColor: currentPlayerData.color }}
                    />
                    <span className="text-title-medium text-surface-on font-semibold capitalize">
                      {currentPlayerData.color}
                    </span>
                  </div>
                </div>
                <div className="p-md3-2 bg-primary-container rounded-md3-sm border-primary flex items-center justify-between border">
                  <span className="text-body-medium text-primary-on-container opacity-80">
                    Armies Available:
                  </span>
                  <span className="text-title-medium text-primary-on-container font-bold">
                    {currentPlayerData.armies_available}
                  </span>
                </div>
                <div className="p-md3-2 bg-surface-container rounded-md3-sm flex items-center justify-between">
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
        <div className="animate-md3-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-md3-xl p-md3-6 mx-md3-4 border-outline shadow-md3-5 animate-md3-spring-bounce w-full max-w-md border">
            <h3 className="text-headline-medium text-surface-on mb-md3-4">Place Armies</h3>
            <div className="bg-primary-container rounded-md3-md p-md3-3 mb-md3-4 border-primary border">
              <p className="text-label-medium text-primary-on-container mb-md3-1 opacity-80">
                Territory
              </p>
              <p className="text-title-large text-primary-on-container font-semibold capitalize">
                {selectedTerritory.territory_name.replace(/-/g, ' ')}
              </p>
            </div>
            <div className="mb-md3-6">
              <label className="text-label-large text-surface-on mb-md3-2 block">
                Number of armies
              </label>
              <p className="text-body-small text-surface-on mb-md3-3 opacity-70">
                Available: {currentPlayerData.armies_available}
              </p>
              <input
                type="number"
                min="1"
                max={currentPlayerData.armies_available}
                value={armyCount}
                onChange={(e) =>
                  setArmyCount(
                    Math.max(
                      1,
                      Math.min(currentPlayerData.armies_available, Number(e.target.value))
                    )
                  )
                }
                className="px-md3-4 py-md3-3 rounded-md3-md bg-surface-container border-outline text-surface-on focus:border-primary duration-md3-short4 text-body-large w-full border-2 transition-colors focus:outline-none"
              />
            </div>
            <div className="gap-md3-3 flex">
              <button
                onClick={handlePlaceArmies}
                disabled={placing || armyCount < 1}
                className="px-md3-6 py-md3-3 bg-primary hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant rounded-md3-xl text-label-large duration-md3-medium2 text-primary-on active:scale-98 flex-1 font-medium transition-all disabled:cursor-not-allowed"
              >
                {placing
                  ? 'Placing...'
                  : `Place ${armyCount} ${armyCount === 1 ? 'Army' : 'Armies'}`}
              </button>
              <button
                onClick={() => setSelectedTerritory(null)}
                disabled={placing}
                className="px-md3-6 py-md3-3 bg-surface-container-highest hover:shadow-md3-1 rounded-md3-xl text-label-large duration-md3-medium2 text-surface-on active:scale-98 flex-1 font-medium transition-all disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attack Modal */}
      {game?.phase === 'attack' && (attackFrom || attackTo || attackResult) && (
        <div className="animate-md3-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-md3-xl p-md3-6 mx-md3-4 border-outline shadow-md3-5 animate-md3-spring-bounce w-full max-w-md border">
            <h3 className="text-headline-medium text-surface-on mb-md3-4">Attack</h3>

            {!attackResult && (
              <>
                <div className="space-y-md3-3 mb-md3-6">
                  <div className="bg-primary-container border-primary rounded-md3-md p-md3-3 border-2">
                    <p className="text-label-small text-primary-on-container mb-md3-1 opacity-70">
                      From:
                    </p>
                    <p className="text-title-medium text-primary-on-container font-semibold capitalize">
                      {attackFrom
                        ? attackFrom.territory_name.replace(/-/g, ' ')
                        : 'Select your territory (2+ armies)'}
                    </p>
                    {attackFrom && (
                      <p className="text-body-small text-primary-on-container mt-md3-1 opacity-80">
                        Armies: {attackFrom.army_count}
                      </p>
                    )}
                  </div>
                  <div className="bg-error-container border-error rounded-md3-md p-md3-3 border-2">
                    <p className="text-label-small text-error-on-container mb-md3-1 opacity-70">
                      To:
                    </p>
                    <p className="text-title-medium text-error-on-container font-semibold capitalize">
                      {attackTo
                        ? attackTo.territory_name.replace(/-/g, ' ')
                        : 'Select enemy territory (adjacent)'}
                    </p>
                    {attackTo && (
                      <p className="text-body-small text-error-on-container mt-md3-1 opacity-80">
                        Armies: {attackTo.army_count}
                      </p>
                    )}
                  </div>
                </div>

                <div className="gap-md3-3 flex">
                  {attackFrom && attackTo && (
                    <button
                      onClick={handleAttack}
                      disabled={attacking}
                      className="px-md3-6 py-md3-3 bg-error hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant rounded-md3-xl text-label-large duration-md3-medium2 text-error-on active:scale-98 flex-1 font-bold transition-all disabled:cursor-not-allowed"
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
                    className="px-md3-6 py-md3-3 bg-surface-container-highest hover:shadow-md3-1 rounded-md3-xl text-label-large duration-md3-medium2 text-surface-on active:scale-98 flex-1 font-medium transition-all disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {attackResult && (
              <div className="text-center">
                <div
                  className={`text-display-small mb-md3-6 font-bold ${attackResult.conquered ? 'text-tertiary' : 'text-secondary'}`}
                >
                  {attackResult.conquered ? '🎉 Victory!' : '⚔️ Battle!'}
                </div>
                <div className="gap-md3-4 mb-md3-4 grid grid-cols-2">
                  <div className="bg-primary-container border-primary rounded-md3-md p-md3-3 border">
                    <p className="text-label-medium text-primary-on-container mb-md3-2 opacity-80">
                      Attacker
                    </p>
                    <p className="text-title-medium text-primary-on-container mb-md3-1 font-bold">
                      Dice: {attackResult.attackerDice.join(', ')}
                    </p>
                    <p className="text-label-large text-error font-semibold">
                      Lost: {attackResult.attackerLosses}
                    </p>
                  </div>
                  <div className="bg-error-container border-error rounded-md3-md p-md3-3 border">
                    <p className="text-label-medium text-error-on-container mb-md3-2 opacity-80">
                      Defender
                    </p>
                    <p className="text-title-medium text-error-on-container mb-md3-1 font-bold">
                      Dice: {attackResult.defenderDice.join(', ')}
                    </p>
                    <p className="text-label-large text-error font-semibold">
                      Lost: {attackResult.defenderLosses}
                    </p>
                  </div>
                </div>
                {attackResult.conquered && (
                  <div className="bg-tertiary-container rounded-md3-md p-md3-3 mb-md3-3 border-tertiary border">
                    <p className="text-title-medium text-tertiary-on-container font-bold">
                      Territory conquered!
                    </p>
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
        <div className="animate-md3-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-md3-xl p-md3-6 mx-md3-4 border-outline shadow-md3-5 animate-md3-spring-bounce w-full max-w-md border">
            <h3 className="text-headline-medium text-surface-on mb-md3-4">Fortify</h3>

            <div className="space-y-md3-3 mb-md3-6">
              <div className="bg-primary-container border-primary rounded-md3-md p-md3-3 border-2">
                <p className="text-label-small text-primary-on-container mb-md3-1 opacity-70">
                  From:
                </p>
                <p className="text-title-medium text-primary-on-container font-semibold capitalize">
                  {fortifyFrom
                    ? fortifyFrom.territory_name.replace(/-/g, ' ')
                    : 'Select source territory (2+ armies)'}
                </p>
                {fortifyFrom && (
                  <p className="text-body-small text-primary-on-container mt-md3-1 opacity-80">
                    Armies: {fortifyFrom.army_count}
                  </p>
                )}
              </div>
              <div className="bg-tertiary-container border-tertiary rounded-md3-md p-md3-3 border-2">
                <p className="text-label-small text-tertiary-on-container mb-md3-1 opacity-70">
                  To:
                </p>
                <p className="text-title-medium text-tertiary-on-container font-semibold capitalize">
                  {fortifyTo
                    ? fortifyTo.territory_name.replace(/-/g, ' ')
                    : 'Select destination (your territory)'}
                </p>
                {fortifyTo && (
                  <p className="text-body-small text-tertiary-on-container mt-md3-1 opacity-80">
                    Armies: {fortifyTo.army_count}
                  </p>
                )}
              </div>
            </div>

            {fortifyFrom && fortifyTo && (
              <div className="mb-md3-6">
                <label className="text-label-large text-surface-on mb-md3-2 block">
                  Armies to move
                </label>
                <p className="text-body-small text-surface-on mb-md3-3 opacity-70">
                  Max: {fortifyFrom.army_count - 1}
                </p>
                <input
                  type="range"
                  min="1"
                  max={fortifyFrom.army_count - 1}
                  value={fortifyCount}
                  onChange={(e) => setFortifyCount(Number(e.target.value))}
                  className="bg-surface-container rounded-md3-lg accent-primary h-2 w-full cursor-pointer appearance-none"
                />
                <div className="text-body-small text-surface-on mt-md3-2 flex justify-between opacity-70">
                  <span>1</span>
                  <span className="text-primary text-title-large font-bold">{fortifyCount}</span>
                  <span>{fortifyFrom.army_count - 1}</span>
                </div>
              </div>
            )}

            <div className="gap-md3-3 flex">
              {fortifyFrom && fortifyTo && (
                <button
                  onClick={handleFortify}
                  disabled={fortifying}
                  className="px-md3-6 py-md3-3 bg-tertiary hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant rounded-md3-xl text-label-large duration-md3-medium2 text-tertiary-on active:scale-98 flex-1 font-bold transition-all disabled:cursor-not-allowed"
                >
                  {fortifying
                    ? 'Moving...'
                    : `Move ${fortifyCount} ${fortifyCount === 1 ? 'Army' : 'Armies'}`}
                </button>
              )}
              <button
                onClick={() => {
                  setFortifyFrom(null);
                  setFortifyTo(null);
                  setFortifyCount(1);
                }}
                disabled={fortifying}
                className="px-md3-6 py-md3-3 bg-surface-container-highest hover:shadow-md3-1 rounded-md3-xl text-label-large duration-md3-medium2 text-surface-on active:scale-98 flex-1 font-medium transition-all disabled:cursor-not-allowed"
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
