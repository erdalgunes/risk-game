"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADJACENCY_MAP = exports.TERRITORY_NAMES = void 0;
exports.createInitialTerritories = createInitialTerritories;
exports.areTerritoriesAdjacent = areTerritoriesAdjacent;
exports.TERRITORY_NAMES = {
    '1': 'Territory 1',
    '2': 'Territory 2',
    '3': 'Territory 3',
    '4': 'Territory 4',
    '5': 'Territory 5',
    '6': 'Territory 6',
};
exports.ADJACENCY_MAP = {
    '1': ['2', '4'],
    '2': ['1', '3', '5'],
    '3': ['2', '6'],
    '4': ['1', '5'],
    '5': ['2', '4', '6'],
    '6': ['3', '5'],
};
function createInitialTerritories(redPlayerId, bluePlayerId) {
    return [
        {
            id: '1',
            name: exports.TERRITORY_NAMES['1'],
            ownerId: redPlayerId,
            troops: 3,
            adjacentTerritories: exports.ADJACENCY_MAP['1'],
        },
        {
            id: '2',
            name: exports.TERRITORY_NAMES['2'],
            ownerId: redPlayerId,
            troops: 3,
            adjacentTerritories: exports.ADJACENCY_MAP['2'],
        },
        {
            id: '3',
            name: exports.TERRITORY_NAMES['3'],
            ownerId: redPlayerId,
            troops: 3,
            adjacentTerritories: exports.ADJACENCY_MAP['3'],
        },
        {
            id: '4',
            name: exports.TERRITORY_NAMES['4'],
            ownerId: bluePlayerId,
            troops: 3,
            adjacentTerritories: exports.ADJACENCY_MAP['4'],
        },
        {
            id: '5',
            name: exports.TERRITORY_NAMES['5'],
            ownerId: bluePlayerId,
            troops: 3,
            adjacentTerritories: exports.ADJACENCY_MAP['5'],
        },
        {
            id: '6',
            name: exports.TERRITORY_NAMES['6'],
            ownerId: bluePlayerId,
            troops: 3,
            adjacentTerritories: exports.ADJACENCY_MAP['6'],
        },
    ];
}
function areTerritoriesAdjacent(territory1, territory2) {
    return exports.ADJACENCY_MAP[territory1].includes(territory2);
}
