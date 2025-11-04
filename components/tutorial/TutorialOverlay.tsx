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
  const tutorialStep = getTutorialStep(currentStep);

  if (!tutorialStep) return null;

  async function handleContinue() {
    setAdvancing(true);
    try {
      const result = await advanceTutorialStep(gameId, playerId);
      if (!result.success) {
        addToast(result.error || 'Failed to advance tutorial', 'error');
      } else {
        onStepAdvanced?.();
      }
    } catch (error) {
      console.error('Error advancing tutorial:', error);
      addToast('Failed to advance tutorial', 'error');
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-8 max-w-2xl w-full mx-4 border-4 border-blue-500 shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4" aria-hidden="true">
            📚
          </div>
          <h2
            id="tutorial-title"
            className="text-4xl font-bold text-white mb-4"
          >
            {tutorialStep.title}
          </h2>
          <p
            id="tutorial-description"
            className="text-xl text-gray-200 mb-6 leading-relaxed"
          >
            {tutorialStep.description}
          </p>

          <div className="bg-yellow-500 bg-opacity-20 border-2 border-yellow-400 rounded-lg p-4 mb-8">
            <p className="text-sm text-yellow-200 font-semibold mb-1">
              OBJECTIVE
            </p>
            <p className="text-lg text-white font-bold">
              {tutorialStep.objective}
            </p>
          </div>

          {currentStep === 0 && (
            <button
              onClick={handleContinue}
              disabled={advancing}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-xl transition text-white"
              aria-label="Continue to next tutorial step"
            >
              {advancing ? 'Loading...' : 'Continue'}
            </button>
          )}

          {currentStep > 0 && (
            <p className="text-gray-300 text-sm">
              Complete the objective to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
