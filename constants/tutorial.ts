import type { TutorialStep, TutorialScenario } from '@/types/game';

/**
 * Tutorial Scenario Configuration
 * Pre-defined territory distribution for single-player tutorial
 */
export const TUTORIAL_SCENARIO: TutorialScenario = {
  playerColor: 'blue',
  aiColor: 'red',
  playerStartingArmies: 5,
  playerTerritories: [
    { territory: 'alaska', armies: 3 },
    { territory: 'alberta', armies: 3 },
    { territory: 'ontario', armies: 3 },
  ],
  aiTerritories: [
    { territory: 'northwest-territory', armies: 2 },
    { territory: 'greenland', armies: 2 },
    { territory: 'iceland', armies: 2 },
    { territory: 'great-britain', armies: 2 },
    { territory: 'scandinavia', armies: 2 },
  ],
};

/**
 * Tutorial Steps with Guidance
 * Each step teaches a specific game mechanic
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    step: 0,
    title: 'Welcome to Risk!',
    description: 'Learn to reinforce, attack, and fortify your territories.',
    objective: 'Click "Continue" to start the tutorial',
    phase: 'setup',
    allowedActions: [],
  },
  {
    step: 1,
    title: 'Reinforcement Phase',
    description: 'Place 5 armies on Alaska, Alberta, or Ontario.',
    objective: 'Place all 5 armies on your territories',
    phase: 'reinforcement',
    allowedActions: ['place'],
  },
  {
    step: 2,
    title: 'Attack Phase',
    description: 'Select Alaska, then attack adjacent Northwest Territory.',
    objective: 'Attack and conquer Northwest Territory',
    phase: 'attack',
    allowedActions: ['attack'],
  },
  {
    step: 3,
    title: 'Fortify Phase',
    description: 'Move armies from Alberta to strengthen Alaska.',
    objective: 'Move armies from Alberta to Alaska',
    phase: 'fortify',
    allowedActions: ['fortify'],
  },
  {
    step: 4,
    title: 'Continue Playing',
    description: 'Conquer all territories: Reinforce, Attack, Fortify, End Turn.',
    objective: 'Conquer all enemy territories to win the game!',
    phase: 'reinforcement',
    allowedActions: ['place', 'attack', 'fortify', 'end_turn'],
  },
];

/**
 * Get tutorial step by number
 */
export function getTutorialStep(step: number): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((s) => s.step === step);
}

/**
 * Check if tutorial is complete
 */
export function isTutorialComplete(step: number): boolean {
  return step >= TUTORIAL_STEPS.length;
}
