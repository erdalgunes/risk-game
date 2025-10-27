'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createGame, joinGame, getAvailableGames } from '@/lib/supabase/queries';
import { PLAYER_COLORS } from '@/constants/map';

export function Lobby() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    loadAvailableGames();
  }, []);

  async function loadAvailableGames() {
    try {
      const games = await getAvailableGames();
      setAvailableGames(games || []);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }

  async function handleCreateGame() {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    setLoading(true);
    try {
      const game = await createGame(maxPlayers);
      const player = await joinGame(game.id, username, selectedColor);
      router.push(`/game/${game.id}?playerId=${player.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGame(gameId: string) {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    setLoading(true);
    try {
      const player = await joinGame(gameId, username, selectedColor);
      router.push(`/game/${gameId}?playerId=${player.id}`);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game. Color may be taken or game is full.');
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
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-white">Create Game</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Your Color
              </label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value as any)}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              >
                {PLAYER_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Max Players
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Players
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateGame}
              disabled={loading || !username.trim()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition text-white"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </div>

        {/* Join Game Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Available Games</h2>
            <button
              onClick={loadAvailableGames}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableGames.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No games available. Create one!
              </p>
            ) : (
              availableGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
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
                        (game.players?.length || 0) >= game.max_players
                      }
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition text-white text-sm"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold mb-3 text-white">How to Play</h3>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>1. Enter your username and choose a color</li>
          <li>2. Create a new game or join an existing one</li>
          <li>3. Wait for other players to join</li>
          <li>4. Conquer all territories to win!</li>
        </ul>
      </div>
    </div>
  );
}
