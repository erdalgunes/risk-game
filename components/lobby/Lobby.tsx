'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAvailableGames } from '@/lib/supabase/queries';
import { createGameAction, joinGameAction } from '@/app/actions/game';
import { PLAYER_COLORS } from '@/constants/map';
import { useToast } from '@/lib/hooks/useToast';
import { validateUsername } from '@/lib/validation/username';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';

export function Lobby() {
  const router = useRouter();
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    loadAvailableGames();
  }, []);

  function handleUsernameChange(value: string) {
    setUsername(value);

    // Clear error when user starts typing
    if (usernameError) {
      setUsernameError(null);
    }

    // Validate on change (only if not empty)
    if (value.trim()) {
      const validation = validateUsername(value);
      if (!validation.isValid) {
        setUsernameError(validation.error || null);
      }
    }
  }

  async function loadAvailableGames() {
    try {
      const games = await getAvailableGames();
      setAvailableGames(games || []);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }

  async function handleCreateGame() {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameError(validation.error || 'Invalid username');
      addToast(validation.error || 'Please enter a valid username', 'warning');
      return;
    }

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.CREATE_GAME;
    if (!rateLimiter.check('create-game', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('create-game');
      addToast(`Too many requests. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await createGameAction(username.trim(), selectedColor, maxPlayers);
      if (response.success && response.result) {
        router.push(`/game/${response.result.gameId}?playerId=${response.result.playerId}`);
      } else {
        throw new Error(response.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      addToast('Failed to create game. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGame(gameId: string) {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameError(validation.error || 'Invalid username');
      addToast(validation.error || 'Please enter a valid username', 'warning');
      return;
    }

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.JOIN_GAME;
    if (!rateLimiter.check('join-game', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('join-game');
      addToast(`Too many requests. Please wait ${resetTime} seconds.`, 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await joinGameAction(gameId, username.trim(), selectedColor);
      if (response.success && response.result) {
        router.push(`/game/${response.result.gameId}?playerId=${response.result.playerId}`);
      } else {
        throw new Error(response.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      addToast('Failed to join game. Color may be taken or game is full.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 text-white">Risk</h1>
        <p className="text-xl text-gray-300">Multiplayer Strategy Game</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Create Game Section */}
        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700" aria-labelledby="create-game-heading">
          <h2 id="create-game-heading" className="text-2xl font-bold mb-4 text-white">Create Game</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateGame(); }} aria-label="Create new game">
            <div>
              <label htmlFor="username-create" className="block text-sm font-medium mb-2 text-gray-300">
                Username
              </label>
              <input
                id="username-create"
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Enter your username"
                className={`w-full px-4 py-2 rounded bg-gray-700 border text-white focus:outline-none ${
                  usernameError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-600 focus:border-blue-500'
                }`}
                aria-required="true"
                aria-describedby={usernameError ? "username-error" : "username-hint"}
                aria-invalid={!!usernameError}
              />
              {usernameError ? (
                <p id="username-error" className="text-red-400 text-sm mt-1" role="alert">
                  {usernameError}
                </p>
              ) : (
                <span id="username-hint" className="sr-only">Enter a username to identify yourself in the game</span>
              )}
            </div>

            <div>
              <label htmlFor="color-select" className="block text-sm font-medium mb-2 text-gray-300">
                Your Color
              </label>
              <select
                id="color-select"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value as any)}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
                aria-label="Select your player color"
              >
                {PLAYER_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="max-players" className="block text-sm font-medium mb-2 text-gray-300">
                Max Players
              </label>
              <select
                id="max-players"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
                aria-label="Select maximum number of players"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Players
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !!usernameError}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition text-white"
              aria-label={loading ? 'Creating game...' : 'Create game'}
              aria-busy={loading}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        </section>

        {/* Join Game Section */}
        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700" aria-labelledby="available-games-heading">
          <div className="flex justify-between items-center mb-4">
            <h2 id="available-games-heading" className="text-2xl font-bold text-white">Available Games</h2>
            <button
              onClick={loadAvailableGames}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
              aria-label="Refresh available games list"
            >
              Refresh
            </button>
          </div>

          {availableGames.length === 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <p className="text-gray-400 text-center py-8" role="status">
                No games available. Create one!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto" role="list" aria-label="Available games">{
              availableGames.map((game) => (
                <article
                  key={game.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                  role="listitem"
                  aria-label={`Game ${game.id.slice(0, 8)}, ${game.players?.length || 0} of ${game.max_players} players, ${game.status}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">
                        Game #{game.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-400">
                        Players: {game.players?.length || 0} / {game.max_players}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        Status: {game.status}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={
                        loading ||
                        !username.trim() ||
                        !!usernameError ||
                        (game.players?.length || 0) >= game.max_players
                      }
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white text-sm"
                      aria-label={`Join game ${game.id.slice(0, 8)}`}
                      aria-disabled={
                        loading ||
                        !username.trim() ||
                        !!usernameError ||
                        (game.players?.length || 0) >= game.max_players
                      }
                    >
                      Join
                    </button>
                  </div>
                </article>
              ))
            }
            </div>
          )}
        </section>
      </div>

      {/* Instructions */}
      <section className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700" aria-labelledby="instructions-heading">
        <h3 id="instructions-heading" className="text-lg font-bold mb-3 text-white">How to Play</h3>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside" role="list">
          <li>Enter your username and choose a color</li>
          <li>Create a new game or join an existing one</li>
          <li>Wait for other players to join</li>
          <li>Conquer all territories to win!</li>
        </ol>
      </section>
    </div>
  );
}
