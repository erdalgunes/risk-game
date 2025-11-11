/**
 * Game move validation logic
 */
import type { GameState, MoveValidation, TerritoryId } from './types';
/**
 * Validate an attack move
 */
export declare function validateAttack(gameState: GameState, fromTerritoryId: TerritoryId, toTerritoryId: TerritoryId): MoveValidation;
/**
 * Validate a fortify move (moving troops between your own territories)
 */
export declare function validateFortify(gameState: GameState, fromTerritoryId: TerritoryId, toTerritoryId: TerritoryId, troopCount: number): MoveValidation;
/**
 * Check if game is over (one player controls all territories)
 */
export declare function checkWinner(gameState: GameState): string | null;
