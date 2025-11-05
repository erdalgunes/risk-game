'use client';

import { getTutorialStep } from '@/constants/tutorial';
import { advanceTutorialStep } from '@/app/actions/tutorial';
import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';

interface TutorialOverlayProps {
  gameId: string;
  playerId: string;
  currentStep: number;
  onStepAdvanced?: () => void;
}

export function TutorialOverlay({
  gameId,
  playerId,
  currentStep,
  onStepAdvanced,
}: TutorialOverlayProps) {
  const { addToast } = useToast();
  const [advancing, setAdvancing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const tutorialStep = getTutorialStep(currentStep);

  if (!tutorialStep) return null;

  async function handleContinue() {
    setAdvancing(true);
    try {
      const result = await advanceTutorialStep(gameId, playerId);
      if (!result.success) {
        addToast(result.error || 'Failed to advance tutorial', 'error');
      } else {
        addToast('✓ Welcome complete! Let\'s start learning...', 'success');
        onStepAdvanced?.();
      }
    } catch (error) {
      console.error('Error advancing tutorial:', error);
      addToast('Failed to advance tutorial', 'error');
    } finally {
      setAdvancing(false);
    }
  }

  // Minimized view
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed top-20 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition flex items-center gap-2"
        aria-label="Show tutorial panel"
      >
        <span className="text-xl">📚</span>
        <span className="font-semibold">Tutorial</span>
      </button>
    );
  }

  return (
    <>
      {/* Light backdrop - non-blocking, just dimming for focus */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 pointer-events-none z-40"
        aria-hidden="true"
      />

      {/* Floating sidebar - desktop: top-right, mobile: bottom */}
      <div
        className="fixed top-20 right-4 z-50 w-80 max-h-[calc(100vh-6rem)]
                   md:top-20 md:right-4 md:w-96
                   sm:top-auto sm:bottom-4 sm:right-4 sm:left-4 sm:w-auto
                   animate-slide-in-right"
        role="dialog"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
      >
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border-2 border-blue-500 shadow-2xl overflow-y-auto max-h-full">
          {/* Header with minimize button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl" aria-hidden="true">
                📚
              </div>
              <h2
                id="tutorial-title"
                className="text-2xl font-bold text-white"
              >
                {tutorialStep.title}
              </h2>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="text-gray-300 hover:text-white transition p-1 rounded hover:bg-blue-700"
              aria-label="Minimize tutorial panel"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p
            id="tutorial-description"
            className="text-base text-gray-200 mb-4 leading-relaxed"
          >
            {tutorialStep.description}
          </p>

          {/* Objective box */}
          <div className="bg-yellow-500 bg-opacity-20 border-2 border-yellow-400 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-200 font-semibold mb-1 uppercase">
              Objective
            </p>
            <p className="text-sm text-white font-bold">
              {tutorialStep.objective}
            </p>
          </div>

          {/* Action button or status */}
          {currentStep === 0 && (
            <button
              onClick={handleContinue}
              disabled={advancing}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-base transition text-white"
              aria-label="Continue to next tutorial step"
            >
              {advancing ? 'Loading...' : 'Continue'}
            </button>
          )}

          {currentStep > 0 && (
            <p className="text-gray-300 text-sm text-center">
              Complete the objective to continue
            </p>
          )}
        </div>
      </div>
    </>
  );
}
