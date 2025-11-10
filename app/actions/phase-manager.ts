/**
 * Phase Manager
 *
 * Manages game phase lifecycle and transitions.
 * Provides factory method for getting phase delegates.
 *
 * Phase Flow:
 * reinforcement → attack → fortify → (next turn) → reinforcement
 */

import type { GamePhase } from '@/types/game';
import { PhaseDelegate, type PhaseContext } from './phases/PhaseDelegate';
import { ReinforcementPhaseDelegate } from './phases/ReinforcementPhaseDelegate';
import { AttackPhaseDelegate } from './phases/AttackPhaseDelegate';
import { FortifyPhaseDelegate } from './phases/FortifyPhaseDelegate';

/**
 * Singleton instances of phase delegates
 */
const phaseDelegates = {
  reinforcement: new ReinforcementPhaseDelegate(),
  attack: new AttackPhaseDelegate(),
  fortify: new FortifyPhaseDelegate(),
} as const;

/**
 * Get the delegate for a specific phase
 *
 * @param phase The game phase
 * @returns The phase delegate instance
 */
export function getPhaseDelegate(phase: 'reinforcement'): ReinforcementPhaseDelegate;
export function getPhaseDelegate(phase: 'attack'): AttackPhaseDelegate;
export function getPhaseDelegate(phase: 'fortify'): FortifyPhaseDelegate;
export function getPhaseDelegate(phase: GamePhase): PhaseDelegate;
export function getPhaseDelegate(phase: GamePhase): PhaseDelegate {
  const delegate = phaseDelegates[phase];

  if (!delegate) {
    throw new Error(`Unknown phase: ${phase}`);
  }

  return delegate;
}

/**
 * Transition from current phase to a new phase
 *
 * Handles the full phase lifecycle:
 * 1. Call onExit() for current phase
 * 2. Update database with new phase
 * 3. Call onEnter() for new phase
 *
 * @param context Game context
 * @param newPhase Phase to transition to
 */
export async function transitionToPhase(context: PhaseContext, newPhase: GamePhase): Promise<void> {
  const currentPhase = context.game.phase;

  // Skip if already in target phase
  if (currentPhase === newPhase) {
    return;
  }

  try {
    // 1. Call onExit for current phase
    const currentDelegate = getPhaseDelegate(currentPhase);
    await currentDelegate.onExit(context);

    // 2. Update database with new phase
    const { error: updateError } = await context.supabase
      .from('games')
      .update({ phase: newPhase })
      .eq('id', context.gameId);

    if (updateError) {
      throw new Error(`Failed to update phase in database: ${updateError.message}`);
    }

    // 3. Update context with new phase
    context.game.phase = newPhase;

    // 4. Call onEnter for new phase
    const newDelegate = getPhaseDelegate(newPhase);
    await newDelegate.onEnter(context);
  } catch (error: any) {
    console.error(`Phase transition failed (${currentPhase} → ${newPhase}):`, error);
    throw new Error(`Phase transition failed: ${error.message}`);
  }
}

/**
 * Get the next phase in the turn cycle
 *
 * @param currentPhase Current phase
 * @returns Next phase in sequence
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  const phaseSequence: GamePhase[] = ['reinforcement', 'attack', 'fortify'];
  const currentIndex = phaseSequence.indexOf(currentPhase);
  const nextIndex = (currentIndex + 1) % phaseSequence.length;
  return phaseSequence[nextIndex];
}

/**
 * Validate that a phase transition is allowed
 *
 * @param fromPhase Current phase
 * @param toPhase Target phase
 * @returns true if transition is valid
 */
export function isValidTransition(fromPhase: GamePhase, toPhase: GamePhase): boolean {
  // All phases can transition to any other phase
  // (Game rules allow skipping phases)
  return true;
}
