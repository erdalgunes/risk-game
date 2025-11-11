'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');

  const handleSinglePlayer = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    const gameId = `game-${Date.now()}`;
    router.push(`/game/${gameId}?mode=single&player=${encodeURIComponent(playerName)}`);
  };

  const handleMultiplayer = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    const gameId = `game-${Date.now()}`;
    router.push(`/game/${gameId}?mode=multi&player=${encodeURIComponent(playerName)}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Risk Game</h1>
          <p className="text-gray-400">Proof of Concept</p>
          <p className="text-sm text-gray-500 mt-2">
            Simplified 6-territory, 2-player version
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSinglePlayer}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Play vs AI
            </button>

            <button
              onClick={handleMultiplayer}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              Multiplayer (2 Players)
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p className="font-semibold">How to Play:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>6 territories: Red (1-3) vs Blue (4-6)</li>
            <li>Attack adjacent enemy territories</li>
            <li>Move troops between your territories</li>
            <li>First to control all 6 territories wins!</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
