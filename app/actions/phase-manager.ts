/**
 * Phase Manager
 *
 * Factory and orchestration for game phase delegates.
 * Implements the State pattern by managing phase transitions and delegate lifecycle.
 *
 * Responsibilities:
 * - Create appropriate delegate instance for current phase
 * - Validate and execute phase transitions
 * - Update database with new phase
 *
 * Design Pattern: Factory + State Pattern
 */

import type { GamePhase } from '@/types/game';
import type { PhaseDelegate, PhaseContext } from './phases/PhaseDelegate';
import { ReinforcementPhaseDelegate } from './phases/ReinforcementPhaseDelegate';
import { AttackPhaseDelegate } from './phases/AttackPhaseDelegate';
import { FortifyPhaseDelegate } from './phases/FortifyPhaseDelegate';

/**
 * Delegate instances (singleton per phase)
 * Created lazily on first access
 */
const delegateCache: Partial<Record<GamePhase, PhaseDelegate>> = {};

/**
 * Get phase delegate for specified phase
 *
 * Factory function that returns the appropriate delegate instance.
 * Uses singleton pattern - each delegate is created once and reused.
 *
 * @param phase The game phase
 * @returns Phase delegate instance
 * @throws Error if phase is invalid
 */
export function getPhaseDelegate(phase: GamePhase): PhaseDelegate {
  // Return cached instance if exists
  if (delegateCache[phase]) {
    return delegateCache[phase]!;
  }

  // Create new instance based on phase
  let delegate: PhaseDelegate;

  switch (phase) {
    case 'reinforcement':
      delegate = new ReinforcementPhaseDelegate();
      break;
    case 'attack':
      delegate = new AttackPhaseDelegate();
      break;
    case 'fortify':
      delegate = new FortifyPhaseDelegate();
      break;
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = phase;
      throw new Error(`Unknown phase: ${phase}`);
  }

  // Cache and return
  delegateCache[phase] = delegate;
  return delegate;
}

/**
 * Transition game to new phase
 *
 * Updates the game phase in the database and returns success/failure.
 * Validates that the transition is allowed before executing.
 *
 * Phase Flow:
 * - reinforcement → attack → fortify → [end turn] → reinforcement (next player)
 *
 * @param context Current game context
 * @param newPhase Phase to transition to
 * @returns Success/failure result
 */
export async function transitionToPhase(
  context: PhaseContext,
  newPhase: GamePhase
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentPhase = context.game.phase;

    // Validate transition is allowed
    const validTransitions: Record<GamePhase, GamePhase[]> = {
      reinforcement: ['attack'],
      attack: ['fortify'],
      fortify: ['reinforcement'], // After end turn
    };

    if (!validTransitions[currentPhase]?.includes(newPhase)) {
      return {
        success: false,
        error: `Invalid phase transition: ${currentPhase} → ${newPhase}`,
      };
    }

    // Update database
    const { error } = await context.supabase
      .from('games')
      .update({ phase: newPhase })
      .eq('id', context.gameId);

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error transitioning phase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get next phase in standard flow
 *
 * Helper function for common phase progression.
 * Does not include turn boundary logic (fortify → reinforcement requires endTurn).
 *
 * @param currentPhase Current phase
 * @returns Next phase or null if at end of turn
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase | null {
  switch (currentPhase) {
    case 'reinforcement':
      return 'attack';
    case 'attack':
      return 'fortify';
    case 'fortify':
      return null; // End turn required
    default:
      return null;
  }
}

/**
 * Validate phase context
 *
 * Ensures the context object has all required properties.
 * Useful for defensive programming at API boundaries.
 *
 * @param context Context to validate
 * @returns true if valid, throws error otherwise
 */
export function validatePhaseContext(context: PhaseContext): boolean {
  if (!context.gameId) throw new Error('Missing gameId in context');
  if (!context.supabase) throw new Error('Missing supabase in context');
  if (!context.game) throw new Error('Missing game in context');
  if (!context.currentPlayer) throw new Error('Missing currentPlayer in context');
  if (!context.players) throw new Error('Missing players in context');
  if (!context.territories) throw new Error('Missing territories in context');

  return true;
}
