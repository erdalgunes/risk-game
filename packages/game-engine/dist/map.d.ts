/**
 * Simplified 6-territory map for proof of concept
 *
 * Layout (simple linear connection):
 * [1] -- [2] -- [3]
 *  |      |      |
 * [4] -- [5] -- [6]
 *
 * Red player starts with territories 1, 2, 3
 * Blue player starts with territories 4, 5, 6
 * Each territory starts with 3 troops
 */
import type { Territory, TerritoryId } from './types';
export declare const TERRITORY_NAMES: Record<TerritoryId, string>;
export declare const ADJACENCY_MAP: Record<TerritoryId, TerritoryId[]>;
export declare function createInitialTerritories(redPlayerId: string, bluePlayerId: string): Territory[];
export declare function areTerritoriesAdjacent(territory1: TerritoryId, territory2: TerritoryId): boolean;
