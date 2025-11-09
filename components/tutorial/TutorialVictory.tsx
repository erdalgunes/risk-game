'use client';

import Link from 'next/link';

export function TutorialVictory() {
  return (
    <div className="container mx-auto p-4" role="main">
      <div className="flex items-center justify-center min-h-screen">
        <section
          className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-8 max-w-2xl w-full border-4 border-green-600 shadow-2xl"
          role="alert"
          aria-live="assertive"
          aria-label="Tutorial completed"
        >
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              Tutorial Complete!
            </h1>
            <div className="text-8xl mb-6" aria-hidden="true">
              🎓
            </div>

            <div className="mb-8">
              <p className="text-2xl text-gray-200 mb-4">
                Congratulations! You have mastered the basics of Risk.
              </p>
              <p className="text-lg text-gray-300">
                You learned how to reinforce territories, attack enemies, and
                fortify your defenses.
              </p>
            </div>

            <div className="bg-black bg-opacity-30 rounded-lg p-6 mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                What You Learned
              </h3>
              <ul className="text-left space-y-3 text-lg text-gray-200">
                <li className="flex items-start">
                  <span className="text-green-400 mr-3" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Reinforcement:</strong> Place armies on your
                    territories at the start of each turn
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Attack:</strong> Use dice combat to conquer enemy
                    territories
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Fortify:</strong> Move armies between connected
                    territories
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Victory:</strong> Conquer all territories to win
                    the game
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-xl transition text-white"
                aria-label="Play multiplayer game"
              >
                Play Multiplayer
              </Link>
              <Link
                href="/"
                className="block w-full px-8 py-4 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition text-white"
                aria-label="Replay tutorial"
              >
                Replay Tutorial
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
