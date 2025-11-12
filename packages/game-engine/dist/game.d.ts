import type { GameState, Move, TerritoryId, Player, Territory } from './types';
export declare function createInitialState(players?: Player[]): GameState;
export declare function getContinentBonus(player: Player, territoryMap: Record<TerritoryId, Territory>): number;
export declare function getPlayerTerritoryCount(player: Player, territoryMap: Record<TerritoryId, Territory>): number;
export declare function calculateReinforcements(state: GameState, player: Player): number;
export declare function validateMove(state: GameState, move: Move): string | null;
export declare function applyMove(state: GameState, move: Move): GameState;
export declare function getValidMoves(state: GameState): Move[];
//# sourceMappingURL=game.d.ts.map