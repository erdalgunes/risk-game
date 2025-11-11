import type { GameState, Move } from './types';
import { getValidMoves } from './game';

function selectRandom<T>(array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

export function getAIMove(state: GameState): Move {
  const validMoves = getValidMoves(state);

  // Filter out skip moves if other moves are available
  const actionMoves = validMoves.filter(m => m.type !== 'skip');

  if (actionMoves.length === 0) {
    return { type: 'skip' };
  }

  // Prefer attacks over fortify moves
  const attackMoves = actionMoves.filter(m => m.type === 'attack');
  if (attackMoves.length > 0) {
    return selectRandom(attackMoves);
  }

  // Otherwise pick a random fortify move
  return selectRandom(actionMoves);
}
