import type { GameState, Move } from './types';
export declare function createInitialState(): GameState;
export declare function validateMove(state: GameState, move: Move): string | null;
export declare function applyMove(state: GameState, move: Move): GameState;
export declare function getValidMoves(state: GameState): Move[];
//# sourceMappingURL=game.d.ts.map