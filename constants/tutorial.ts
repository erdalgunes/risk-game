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
    description:
      'This tutorial will teach you how to play Risk. You will learn how to reinforce territories, attack enemies, and fortify your defenses.',
    objective: 'Click "Continue" to start the tutorial',
    phase: 'setup',
    allowedActions: [],
  },
  {
    step: 1,
    title: 'Reinforcement Phase',
    description:
      'At the start of each turn, you receive reinforcement armies based on territories and continents you control. Place your 5 armies on any of your territories (Alaska, Alberta, or Ontario).',
    objective: 'Place all 5 armies on your territories',
    phase: 'reinforcement',
    allowedActions: ['place'],
  },
  {
    step: 2,
    title: 'Attack Phase - Select Territories',
    description:
      'Now you can attack enemy territories! To attack, you need at least 2 armies on your attacking territory. Click on Alaska (your territory with 2+ armies), then click on Northwest Territory (adjacent enemy territory).',
    objective: 'Select Alaska, then attack Northwest Territory',
    phase: 'attack',
    allowedActions: ['attack'],
  },
  {
    step: 3,
    title: 'Attack Phase - Execute Combat',
    description:
      'Combat uses dice! The attacker rolls up to 3 dice, the defender rolls up to 2. Highest dice are compared. Losses are determined by who rolls higher. Click "Attack!" to execute the attack.',
    objective: 'Execute your attack and see the results',
    phase: 'attack',
    allowedActions: ['attack'],
  },
  {
    step: 4,
    title: 'Fortify Phase',
    description:
      'After attacking, you can fortify by moving armies between your connected territories. This helps you strengthen defenses. Move armies from Alberta to Alaska.',
    objective: 'Move armies from Alberta to Alaska',
    phase: 'fortify',
    allowedActions: ['fortify'],
  },
  {
    step: 5,
    title: 'Continue Playing',
    description:
      'Great job! Now continue playing. Conquer all enemy territories to win! Remember: Reinforce → Attack → Fortify → End Turn.',
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
