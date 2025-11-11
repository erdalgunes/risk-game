/**
 * Basic AI opponent that makes random valid moves
 * This is intentionally simple for the proof of concept
 */
import type { GameState, AIMove } from './types';
/**
 * Decide the AI's next move
 * Strategy: Make random valid moves
 */
export declare function decideAIMove(gameState: GameState): AIMove;
/**
 * Check if AI should take a turn
 */
export declare function shouldAITakeTurn(gameState: GameState): boolean;
