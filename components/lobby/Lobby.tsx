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
  const { addToast} = useToast();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

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
    // Clear previous errors
    setCreateError(null);
    setUsernameError(null);

    // Validate username
    const validation = validateUsername(username);
    if (!validation.isValid) {
      const errorMsg = validation.error || 'Invalid username';
      setUsernameError(errorMsg);
      addToast(errorMsg, 'warning');
      return;
    }

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.CREATE_GAME;
    if (!rateLimiter.check('create-game', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('create-game');
      const errorMsg = `Too many requests. Please wait ${resetTime} seconds.`;
      setCreateError(errorMsg);
      addToast(errorMsg, 'warning');
      return;
    }

    setLoading(true);
    console.log('[Lobby] Creating game...', { username: username.trim(), color: selectedColor, maxPlayers });

    try {
      const response = await createGameAction(username.trim(), selectedColor, maxPlayers);
      console.log('[Lobby] Server response:', response);

      if (!response.success) {
        const errorMsg = response.error || 'Server returned error without message';
        console.error('[Lobby] Server returned error:', errorMsg);
        setCreateError(errorMsg);
        addToast(errorMsg, 'error');
        return;
      }

      if (!response.result) {
        const errorMsg = 'Server succeeded but returned no game data';
        console.error('[Lobby]', errorMsg);
        setCreateError(errorMsg);
        addToast(errorMsg, 'error');
        return;
      }

      console.log('[Lobby] Success! Redirecting to game:', response.result.gameId);
      router.push(`/game/${response.result.gameId}?playerId=${response.result.playerId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Lobby] Exception:', errorMsg, error);
      setCreateError(errorMsg);
      addToast(`Error: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGame(gameId: string) {
    // Clear previous errors
    setJoinError(null);
    setUsernameError(null);

    // Validate username
    const validation = validateUsername(username);
    if (!validation.isValid) {
      const errorMsg = validation.error || 'Invalid username';
      setUsernameError(errorMsg);
      addToast(errorMsg, 'warning');
      return;
    }

    // Rate limiting
    const { limit, windowMs } = RATE_LIMITS.JOIN_GAME;
    if (!rateLimiter.check('join-game', limit, windowMs)) {
      const resetTime = rateLimiter.getResetTime('join-game');
      const errorMsg = `Too many requests. Please wait ${resetTime} seconds.`;
      setJoinError(errorMsg);
      addToast(errorMsg, 'warning');
      return;
    }

    setLoading(true);
    console.log('[Lobby] Joining game...', { gameId, username: username.trim(), color: selectedColor });

    try {
      const response = await joinGameAction(gameId, username.trim(), selectedColor);
      console.log('[Lobby] Join response:', response);

      if (!response.success) {
        const errorMsg = response.error || 'Server returned error without message';
        console.error('[Lobby] Server returned error:', errorMsg);
        setJoinError(errorMsg);
        addToast(errorMsg, 'error');
        return;
      }

      if (!response.result) {
        const errorMsg = 'Server succeeded but returned no game data';
        console.error('[Lobby]', errorMsg);
        setJoinError(errorMsg);
        addToast(errorMsg, 'error');
        return;
      }

      console.log('[Lobby] Join success! Redirecting...');
      router.push(`/game/${response.result.gameId}?playerId=${response.result.playerId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Lobby] Exception:', errorMsg, error);
      setJoinError(errorMsg);
      addToast(`Error: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-6xl font-bold text-white">Risk</h1>
        <p className="text-xl text-gray-300">Multiplayer Strategy Game</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Create Game Section */}
        <section
          className="rounded-lg border border-gray-700 bg-gray-800 p-6"
          aria-labelledby="create-game-heading"
        >
          <h2 id="create-game-heading" className="mb-4 text-2xl font-bold text-white">
            Create Game
          </h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateGame();
            }}
            aria-label="Create new game"
          >
            <div>
              <label
                htmlFor="username-create"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Username
              </label>
              <input
                id="username-create"
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Enter your username"
                className={`w-full rounded border bg-gray-700 px-4 py-2 text-white focus:outline-none ${
                  usernameError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-600 focus:border-blue-500'
                }`}
                aria-required="true"
                aria-describedby={usernameError ? 'username-error' : 'username-hint'}
                aria-invalid={!!usernameError}
              />
              {usernameError ? (
                <p id="username-error" className="mt-1 text-sm text-red-400" role="alert">
                  {usernameError}
                </p>
              ) : (
                <span id="username-hint" className="sr-only">
                  Enter a username to identify yourself in the game
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="color-select"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Your Color
              </label>
              <select
                id="color-select"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value as any)}
                className="w-full rounded border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
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
              <label htmlFor="max-players" className="mb-2 block text-sm font-medium text-gray-300">
                Max Players
              </label>
              <select
                id="max-players"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full rounded border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                aria-label="Select maximum number of players"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Players
                  </option>
                ))}
              </select>
            </div>

            {createError && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm" role="alert">
                <strong>Error:</strong> {createError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !!usernameError}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              aria-label={loading ? 'Creating game...' : 'Create game'}
              aria-busy={loading}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        </section>

        {/* Join Game Section */}
        <section
          className="rounded-lg border border-gray-700 bg-gray-800 p-6"
          aria-labelledby="available-games-heading"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="available-games-heading" className="text-2xl font-bold text-white">
              Available Games
            </h2>
            <button
              onClick={loadAvailableGames}
              className="rounded bg-gray-700 px-3 py-1 text-sm transition hover:bg-gray-600"
              aria-label="Refresh available games list"
            >
              Refresh
            </button>
          </div>

          {availableGames.length === 0 ? (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              <p className="py-8 text-center text-gray-400" role="status">
                No games available. Create one!
              </p>
            </div>
          ) : (
            <div
              className="max-h-96 space-y-3 overflow-y-auto"
              role="list"
              aria-label="Available games"
            >
              {availableGames.map((game) => (
                <article
                  key={game.id}
                  className="rounded-lg border border-gray-600 bg-gray-700 p-4"
                  role="listitem"
                  aria-label={`Game ${game.id.slice(0, 8)}, ${game.players?.length || 0} of ${game.max_players} players, ${game.status}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Game #{game.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-400">
                        Players: {game.players?.length || 0} / {game.max_players}
                      </p>
                      <p className="text-xs capitalize text-gray-500">Status: {game.status}</p>
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={
                        loading ||
                        !username.trim() ||
                        !!usernameError ||
                        (game.players?.length || 0) >= game.max_players
                      }
                      className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
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
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Instructions */}
      <section
        className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6"
        aria-labelledby="instructions-heading"
      >
        <h3 id="instructions-heading" className="mb-3 text-lg font-bold text-white">
          How to Play
        </h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-300" role="list">
          <li>Enter your username and choose a color</li>
          <li>Create a new game or join an existing one</li>
          <li>Wait for other players to join</li>
          <li>Conquer all territories to win!</li>
        </ol>
      </section>
    </div>
  );
}
