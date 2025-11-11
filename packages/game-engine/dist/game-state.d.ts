/**
 * Game state management and core game logic
 */
import type { GameState, Player, TerritoryId, GamePhase } from './types';
import { resolveCombat } from './combat';
/**
 * Create a new game with initial setup
 */
export declare function createGame(gameId: string, player1Name: string, player2Name: string, mode: 'single-player' | 'multiplayer'): GameState;
/**
 * Execute an attack
 */
export declare function executeAttack(gameState: GameState, fromTerritoryId: TerritoryId, toTerritoryId: TerritoryId): {
    updatedState: GameState;
    result: ReturnType<typeof resolveCombat>;
    error?: string;
};
/**
 * Execute a fortify move
 */
export declare function executeFortify(gameState: GameState, fromTerritoryId: TerritoryId, toTerritoryId: TerritoryId, troopCount: number): {
    updatedState: GameState;
    error?: string;
};
/**
 * Change game phase
 */
export declare function changePhase(gameState: GameState, newPhase: GamePhase): GameState;
/**
 * End current player's turn
 */
export declare function endTurn(gameState: GameState): GameState;
/**
 * Get current player
 */
export declare function getCurrentPlayer(gameState: GameState): Player;
