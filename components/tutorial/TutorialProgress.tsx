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
    <div className="mb-4 rounded-lg border-2 border-blue-500 bg-blue-900 p-4">
      <div className="mb-2 flex items-center justify-between">
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

      <div className="h-3 w-full overflow-hidden rounded-full bg-blue-950">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={displayStep}
          aria-valuemin={0}
          aria-valuemax={totalSteps}
        />
      </div>

      <div className="mt-3 rounded border border-yellow-400 bg-yellow-500 bg-opacity-20 p-3">
        <p className="mb-1 text-xs font-semibold text-yellow-200">OBJECTIVE</p>
        <p className="text-sm text-white">{tutorialStep.objective}</p>
      </div>
    </div>
  );
}
