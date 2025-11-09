'use client';

import { getTutorialStep, TUTORIAL_STEPS } from '@/constants/tutorial';

interface TutorialProgressProps {
  currentStep: number;
}

export function TutorialProgress({ currentStep }: TutorialProgressProps) {
  const tutorialStep = getTutorialStep(currentStep);
  const totalSteps = Math.max(1, TUTORIAL_STEPS.length - 1); // Exclude step 0 (welcome)
  const progressStep = Math.max(0, Math.min(totalSteps, currentStep - 1)); // Adjust for welcome step
  const displayStep = progressStep + 1;
  const progressPercent = (displayStep / totalSteps) * 100;

  if (!tutorialStep || currentStep === 0) return null;

  return (
    <div className="bg-blue-900 border-2 border-blue-500 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-blue-300">Tutorial Progress</p>
          <p className="text-lg font-bold text-white">
            Step {displayStep} of {totalSteps}
          </p>
        </div>
        <div className="text-3xl" aria-hidden="true">
          📖
        </div>
      </div>

      <div className="w-full bg-blue-950 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={displayStep}
          aria-valuemin={0}
          aria-valuemax={totalSteps}
        />
      </div>

      <div className="mt-3 bg-yellow-500 bg-opacity-20 border border-yellow-400 rounded p-3">
        <p className="text-xs text-yellow-200 font-semibold mb-1">OBJECTIVE</p>
        <p className="text-sm text-white">{tutorialStep.objective}</p>
      </div>
    </div>
  );
}
