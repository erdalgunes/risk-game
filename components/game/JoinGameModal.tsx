'use client';

import { useState } from 'react';
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

  // Auto-select first available color
  if (availableColors.length > 0 && !availableColors.includes(selectedColor)) {
    setSelectedColor(availableColors[0]);
  }

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
    <div className="min-h-screen bg-gradient-to-b from-surface-dim to-surface flex items-center justify-center p-md3-4">
      <div className="w-full max-w-2xl bg-surface-container-low rounded-md3-lg shadow-md3-3 p-md3-8">
        <h1 className="text-headline-large font-bold text-surface-on mb-md3-6">
          Join Game
        </h1>

        {/* Game Info */}
        {game && (
          <div className="mb-md3-6 p-md3-4 bg-surface-container rounded-md3-md border border-outline-variant">
            <h2 className="text-title-medium text-surface-on mb-md3-2">Game Information</h2>
            <p className="text-body-medium text-surface-on opacity-70">
              Game ID: {gameId.slice(0, 8)}
            </p>
            <p className="text-body-medium text-surface-on opacity-70">
              Players: {players.length} / {game.max_players}
            </p>
            <p className="text-body-medium text-surface-on opacity-70 capitalize">
              Status: {game.status}
            </p>
          </div>
        )}

        {/* Warning Messages - Game Full has higher priority */}
        {isGameFull && (
          <div role="alert" className="mb-md3-4 p-md3-4 bg-error-container rounded-md3-md border border-error">
            <p className="text-error text-body-medium font-medium">
              This game is full. No more players can join.
            </p>
          </div>
        )}
        {isGameStarted && !isGameFull && (
          <div role="alert" className="mb-md3-4 p-md3-4 bg-tertiary-container rounded-md3-md border border-tertiary">
            <p className="text-tertiary text-body-medium font-medium mb-md3-2">
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
                  className="flex items-center gap-md3-3 p-md3-3 bg-surface-container rounded-md3-sm"
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-outline"
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
            <label htmlFor="username-join" className="block text-label-large mb-md3-2 text-surface-on">
              Username
            </label>
            <input
              id="username-join"
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Enter your username"
              className={`w-full px-md3-4 py-md3-3 rounded-md3-sm bg-surface-container border text-surface-on focus:outline-none transition-all duration-md3-short4 ${
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
                Enter a username to join the game (2-16 characters, letters, numbers, underscores, hyphens)
              </span>
            )}
          </div>

          <div>
            <label htmlFor="color-select-join" className="block text-label-large mb-md3-2 text-surface-on">
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
                className="w-full px-md3-4 py-md3-3 rounded-md3-sm bg-surface-container border border-outline text-surface-on focus:outline-none focus:border-primary transition-all duration-md3-short4"
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

          <div className="flex gap-md3-3 pt-md3-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 px-md3-6 py-md3-3 bg-surface-container-highest text-surface-on hover:shadow-md3-1 rounded-md3-xl text-label-large font-medium transition-all duration-md3-medium2 active:scale-98"
              aria-label="Go back to lobby"
            >
              Back to Lobby
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim() || !!usernameError || isGameFull || isGameStarted}
              className="flex-1 px-md3-6 py-md3-3 bg-primary text-primary-on hover:shadow-md3-2 disabled:bg-surface-variant disabled:text-surface-on-variant disabled:cursor-not-allowed rounded-md3-xl text-label-large font-medium transition-all duration-md3-medium2 active:scale-98"
              aria-label={loading ? 'Joining game...' : isGameFull ? 'Game is full' : isGameStarted ? 'Game has started' : 'Join game'}
              aria-busy={loading}
            >
              {loading ? 'Joining...' : isGameFull ? 'Game Full' : isGameStarted ? 'Game Started' : 'Join Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
