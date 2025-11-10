'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGameAction, joinGameAction, startGame } from '@/app/actions/game';
import { PLAYER_COLORS } from '@/constants/map';
import { useToast } from '@/lib/hooks/useToast';
import { validateUsername } from '@/lib/validation/username';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';

const AI_NAMES = [
  'AI_Commander',
  'AI_General',
  'AI_Captain',
  'AI_Major',
  'AI_Colonel',
];

export function SinglePlayerLobby() {
  const router = useRouter();
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [aiOpponents, setAiOpponents] = useState(2);
  const [loading, setLoading] = useState(false);

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

  async function handleStartGame() {
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
      const totalPlayers = aiOpponents + 1;

      // Create game with human player
      const createResponse = await createGameAction(
        username.trim(),
        selectedColor,
        totalPlayers
      );

      if (!createResponse.success || !createResponse.result) {
        throw new Error(createResponse.error || 'Failed to create game');
      }

      const { gameId, playerId } = createResponse.result;

      // Add AI players
      const availableColors = PLAYER_COLORS.filter((c) => c !== selectedColor);
      for (let i = 0; i < aiOpponents; i++) {
        const aiColor = availableColors[i % availableColors.length];
        const aiName = AI_NAMES[i % AI_NAMES.length];

        const joinResponse = await joinGameAction(gameId, aiName, aiColor);
        if (!joinResponse.success) {
          console.error(`Failed to add AI player ${i + 1}:`, joinResponse.error);
        }
      }

      // Start the game
      const startResponse = await startGame(gameId);
      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Failed to start game');
      }

      // Navigate to game
      router.push(`/game/${gameId}?playerId=${playerId}`);
    } catch (error) {
      console.error('Error starting single player game:', error);
      addToast('Failed to start game. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 text-white">Risk</h1>
        <p className="text-xl text-gray-300">Single Player Practice Mode</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Create Single Player Game Section */}
        <section
          className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          aria-labelledby="single-player-heading"
        >
          <h2 id="single-player-heading" className="text-2xl font-bold mb-4 text-white">
            Start Practice Game
          </h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleStartGame();
            }}
            aria-label="Create single player game"
          >
            <div>
              <label
                htmlFor="username-single"
                className="block text-sm font-medium mb-2 text-gray-300"
              >
                Your Username
              </label>
              <input
                id="username-single"
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
                aria-describedby={usernameError ? 'username-error' : 'username-hint'}
                aria-invalid={!!usernameError}
              />
              {usernameError ? (
                <p id="username-error" className="text-red-400 text-sm mt-1" role="alert">
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
                htmlFor="color-select-single"
                className="block text-sm font-medium mb-2 text-gray-300"
              >
                Your Color
              </label>
              <select
                id="color-select-single"
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
              <label
                htmlFor="ai-opponents"
                className="block text-sm font-medium mb-2 text-gray-300"
              >
                Number of AI Opponents
              </label>
              <select
                id="ai-opponents"
                value={aiOpponents}
                onChange={(e) => setAiOpponents(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
                aria-label="Select number of AI opponents"
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} AI Opponents ({n + 1} Players Total)
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <h3 className="text-sm font-semibold mb-2 text-white">Game Summary</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  • <span className="font-medium">You:</span> {username || '(enter name)'} -{' '}
                  {selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}
                </li>
                <li>
                  • <span className="font-medium">AI Opponents:</span> {aiOpponents}
                </li>
                <li>
                  • <span className="font-medium">Total Players:</span> {aiOpponents + 1}
                </li>
                <li>
                  • <span className="font-medium">Difficulty:</span> Random (Practice Mode)
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !!usernameError}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition text-white"
              aria-label={loading ? 'Starting game...' : 'Start practice game'}
              aria-busy={loading}
            >
              {loading ? 'Starting Game...' : 'Start Practice Game'}
            </button>
          </form>
        </section>

        {/* Instructions */}
        <section
          className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700"
          aria-labelledby="practice-instructions-heading"
        >
          <h3 id="practice-instructions-heading" className="text-lg font-bold mb-3 text-white">
            Practice Mode
          </h3>
          <div className="text-sm text-gray-300 space-y-3">
            <p>
              Practice mode lets you play against AI opponents to learn the game mechanics. The AI
              makes random moves, making it perfect for beginners.
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Choose the number of AI opponents (2-5)</li>
              <li>AI players will make moves automatically on their turns</li>
              <li>Game follows standard Risk rules</li>
              <li>Conquer all territories to win!</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
