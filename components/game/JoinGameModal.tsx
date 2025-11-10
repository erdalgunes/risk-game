'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { joinGameAction } from '@/app/actions/game';
import { validateUsername } from '@/lib/validation/username';
import { PLAYER_COLORS } from '@/constants/map';
import { useToast } from '@/lib/hooks/useToast';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';
import type { Game, Player, PlayerColor } from '@/types/game';

interface JoinGameModalProps {
  gameId: string;
  game: Game | null;
  players: Player[];
}

export function JoinGameModal({ gameId, game, players }: JoinGameModalProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');
  const [loading, setLoading] = useState(false);

  // Check if game is full
  const isGameFull = game ? players.length >= game.max_players : false;
  const isGameStarted = game ? game.status !== 'waiting' : false;

  // Get colors already taken by other players
  const takenColors = players.map((p) => p.color);
  const availableColors = PLAYER_COLORS.filter((c) => !takenColors.includes(c));

  // Auto-select first available color (using useEffect to avoid setState during render)
  useEffect(() => {
    if (availableColors.length > 0 && !availableColors.includes(selectedColor)) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor]);

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

  async function handleJoinGame(e: React.FormEvent) {
    e.preventDefault();

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
        // Redirect with playerId in query string
        router.push(`/game/${response.result.gameId}?playerId=${response.result.playerId}`);
        router.refresh(); // Ensure page reloads with new playerId
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
    <div className="from-surface-dim to-surface p-md3-4 flex min-h-screen items-center justify-center bg-gradient-to-b">
      <div className="bg-surface-container-low rounded-md3-lg shadow-md3-3 p-md3-8 w-full max-w-2xl">
        <h1 className="text-headline-large text-surface-on mb-md3-6 font-bold">Join Game</h1>

        {/* Game Info */}
        {game && (
          <div className="mb-md3-6 p-md3-4 bg-surface-container rounded-md3-md border-outline-variant border">
            <h2 className="text-title-medium text-surface-on mb-md3-2">Game Information</h2>
            <p className="text-body-medium text-surface-on opacity-70">
              Game ID: {gameId.slice(0, 8)}
            </p>
            <p className="text-body-medium text-surface-on opacity-70">
              Players: {players.length} / {game.max_players}
            </p>
            <p className="text-body-medium text-surface-on capitalize opacity-70">
              Status: {game.status}
            </p>
          </div>
        )}

        {/* Warning Messages - Game Full has higher priority */}
        {isGameFull && (
          <div
            role="alert"
            className="mb-md3-4 p-md3-4 bg-error-container rounded-md3-md border-error border"
          >
            <p className="text-error text-body-medium font-medium">
              This game is full. No more players can join.
            </p>
          </div>
        )}
        {isGameStarted && !isGameFull && (
          <div
            role="alert"
            className="mb-md3-4 p-md3-4 bg-tertiary-container rounded-md3-md border-tertiary border"
          >
            <p className="text-tertiary text-body-medium mb-md3-2 font-medium">
              This game has already started.
            </p>
            <p className="text-tertiary text-body-small">
              You can still join as an observer to watch the game.
            </p>
          </div>
        )}

        {/* Player List */}
        {players.length > 0 && (
          <div className="mb-md3-6">
            <h2 className="text-title-medium text-surface-on mb-md3-3">Current Players</h2>
            <div className="space-y-md3-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="gap-md3-3 p-md3-3 bg-surface-container rounded-md3-sm flex items-center"
                >
                  <div
                    className="border-outline h-8 w-8 rounded-full border-2"
                    style={{
                      backgroundColor: player.color,
                    }}
                    aria-label={`${player.username}'s color: ${player.color}`}
                  />
                  <span className="text-body-large text-surface-on font-medium">
                    {player.username}
                  </span>
                  {player.is_eliminated && (
                    <span className="text-label-small text-error opacity-80">(Eliminated)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleJoinGame} className="space-y-md3-4">
          <div>
            <label
              htmlFor="username-join"
              className="text-label-large mb-md3-2 text-surface-on block"
            >
              Username
            </label>
            <input
              id="username-join"
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Enter your username"
              className={`px-md3-4 py-md3-3 rounded-md3-sm bg-surface-container text-surface-on duration-md3-short4 w-full border transition-all focus:outline-none ${
                usernameError
                  ? 'border-error focus:border-error'
                  : 'border-outline focus:border-primary'
              }`}
              aria-required="true"
              aria-describedby={usernameError ? 'username-error' : 'username-hint'}
              aria-invalid={!!usernameError}
              autoFocus
            />
            {usernameError ? (
              <p id="username-error" className="text-error text-body-small mt-md3-1" role="alert">
                {usernameError}
              </p>
            ) : (
              <span id="username-hint" className="sr-only">
                Enter a username to join the game (2-16 characters, letters, numbers, underscores,
                hyphens)
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="color-select-join"
              className="text-label-large mb-md3-2 text-surface-on block"
            >
              Your Color
            </label>
            {availableColors.length === 0 ? (
              <p
                role="alert"
                className="text-error text-body-medium p-md3-3 bg-error-container rounded-md3-sm"
              >
                No colors available. Game may be full.
              </p>
            ) : (
              <select
                id="color-select-join"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value as PlayerColor)}
                className="px-md3-4 py-md3-3 rounded-md3-sm bg-surface-container border-outline text-surface-on focus:border-primary duration-md3-short4 w-full border transition-all focus:outline-none"
                aria-label="Select your player color"
              >
                {availableColors.map((color) => (
                  <option key={color} value={color}>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="gap-md3-3 pt-md3-4 flex">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-md3-6 py-md3-3 bg-surface-container-highest text-surface-on hover:shadow-md3-1 rounded-md3-xl text-label-large duration-md3-medium2 active:scale-98 flex-1 font-medium transition-all"
              aria-label="Go back to lobby"
            >
              Back to Lobby
            </button>
            <button
              type="submit"
              disabled={
                loading || !username.trim() || !!usernameError || isGameFull || isGameStarted
              }
              className="px-md3-6 py-md3-3 bg-primary text-primary-on hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant rounded-md3-xl text-label-large duration-md3-medium2 active:scale-98 flex-1 font-medium transition-all disabled:cursor-not-allowed"
              aria-label={
                loading
                  ? 'Joining game...'
                  : isGameFull
                    ? 'Game is full'
                    : isGameStarted
                      ? 'Game has started'
                      : 'Join game'
              }
              aria-busy={loading}
            >
              {loading
                ? 'Joining...'
                : isGameFull
                  ? 'Game Full'
                  : isGameStarted
                    ? 'Game Started'
                    : 'Join Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
