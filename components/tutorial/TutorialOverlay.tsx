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
        addToast("✓ Welcome complete! Let's start learning...", 'success');
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
        className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg transition hover:bg-blue-700"
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
        className="pointer-events-none fixed inset-0 z-40 bg-black bg-opacity-20"
        aria-hidden="true"
      />

      {/* Floating sidebar - desktop: top-right, mobile: bottom */}
      <div
        className="animate-slide-in-right fixed right-4 top-20 z-50 max-h-[calc(100vh-6rem)] w-80 sm:bottom-4 sm:left-4 sm:right-4 sm:top-auto sm:w-auto md:right-4 md:top-20 md:w-96"
        role="dialog"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
      >
        <div className="max-h-full overflow-y-auto rounded-lg border-2 border-blue-500 bg-gradient-to-br from-blue-900 to-blue-800 p-6 shadow-2xl">
          {/* Header with minimize button */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl" aria-hidden="true">
                📚
              </div>
              <h2 id="tutorial-title" className="text-2xl font-bold text-white">
                {tutorialStep.title}
              </h2>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="rounded p-1 text-gray-300 transition hover:bg-blue-700 hover:text-white"
              aria-label="Minimize tutorial panel"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <p id="tutorial-description" className="mb-4 text-base leading-relaxed text-gray-200">
            {tutorialStep.description}
          </p>

          {/* Objective box */}
          <div className="mb-4 rounded-lg border-2 border-yellow-400 bg-yellow-500 bg-opacity-20 p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-yellow-200">Objective</p>
            <p className="text-sm font-bold text-white">{tutorialStep.objective}</p>
          </div>

          {/* Action button or status */}
          {currentStep === 0 && (
            <button
              onClick={handleContinue}
              disabled={advancing}
              className="w-full rounded-lg bg-green-600 px-6 py-3 text-base font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              aria-label="Continue to next tutorial step"
            >
              {advancing ? 'Loading...' : 'Continue'}
            </button>
          )}

          {currentStep > 0 && (
            <p className="text-center text-sm text-gray-300">Complete the objective to continue</p>
          )}
        </div>
      </div>
    </>
  );
}
