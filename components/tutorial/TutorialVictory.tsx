'use client';

import Link from 'next/link';

export function TutorialVictory() {
  return (
    <div className="container mx-auto p-4" role="main">
      <div className="flex min-h-screen items-center justify-center">
        <section
          className="w-full max-w-2xl rounded-lg border-4 border-green-600 bg-gradient-to-br from-green-900 to-green-800 p-8 shadow-2xl"
          role="alert"
          aria-live="assertive"
          aria-label="Tutorial completed"
        >
          <div className="text-center">
            <h1 className="mb-4 text-6xl font-bold text-white">Tutorial Complete!</h1>
            <div className="mb-6 text-8xl" aria-hidden="true">
              🎓
            </div>

            <div className="mb-8">
              <p className="mb-4 text-2xl text-gray-200">
                Congratulations! You have mastered the basics of Risk.
              </p>
              <p className="text-lg text-gray-300">
                You learned how to reinforce territories, attack enemies, and fortify your defenses.
              </p>
            </div>

            <div className="mb-8 rounded-lg bg-black bg-opacity-30 p-6">
              <h3 className="mb-4 text-2xl font-bold text-white">What You Learned</h3>
              <ul className="space-y-3 text-left text-lg text-gray-200">
                <li className="flex items-start">
                  <span className="mr-3 text-green-400" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Reinforcement:</strong> Place armies on your territories at the start of
                    each turn
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-green-400" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Attack:</strong> Use dice combat to conquer enemy territories
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-green-400" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Fortify:</strong> Move armies between connected territories
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-green-400" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Victory:</strong> Conquer all territories to win the game
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full rounded-lg bg-blue-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-blue-700"
                aria-label="Play multiplayer game"
              >
                Play Multiplayer
              </Link>
              <Link
                href="/"
                className="block w-full rounded-lg bg-gray-600 px-8 py-4 font-semibold text-white transition hover:bg-gray-700"
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
