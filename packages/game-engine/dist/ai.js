import { getValidMoves } from './game';
import { continents } from './territoryData';
function selectRandom(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}
function isBorderTerritory(territoryId, player, state) {
    const territory = state.territories[territoryId];
    return territory.adjacentTo.some(adjId => {
        const adjacent = state.territories[adjId];
        return adjacent.owner !== player;
    });
}
function getContinentProgress(state, player) {
    return continents.map(continent => {
        const owned = continent.territories.filter(t => state.territories[t].owner === player).length;
        const missing = continent.territories.filter(t => state.territories[t].owner !== player);
        return {
            continentName: continent.name,
            owned,
            total: continent.territories.length,
            missing
        };
    }).sort((a, b) => {
        // Sort by how close to completion (descending)
        const aPercent = a.owned / a.total;
        const bPercent = b.owned / b.total;
        return bPercent - aPercent;
    });
}
function getSmartDeployment(state) {
    const player = state.currentPlayer;
    const ownedTerritories = Object.values(state.territories).filter(t => t.owner === player);
    // Get continent progress to prioritize near-complete continents
    const continentProgress = getContinentProgress(state, player);
    // Find border territories (adjacent to enemies)
    const borderTerritories = ownedTerritories.filter(t => isBorderTerritory(t.id, player, state));
    // Prioritize territories in near-complete continents
    for (const continent of continentProgress) {
        if (continent.owned > 0 && continent.owned < continent.total) {
            // Find border territories in this continent
            const continentBorders = borderTerritories.filter(t => { var _a; return (_a = continents.find(c => c.name === continent.continentName)) === null || _a === void 0 ? void 0 : _a.territories.includes(t.id); });
            if (continentBorders.length > 0) {
                // Deploy to weakest border territory in this continent
                const weakest = continentBorders.reduce((min, t) => t.troops < min.troops ? t : min, continentBorders[0]);
                return {
                    type: 'deploy',
                    territory: weakest.id,
                    troops: Math.min(state.deployableTroops, 3) // Deploy up to 3 troops at a time
                };
            }
        }
    }
    // Fallback: reinforce weakest border territory
    if (borderTerritories.length > 0) {
        const weakest = borderTerritories.reduce((min, t) => t.troops < min.troops ? t : min, borderTerritories[0]);
        return {
            type: 'deploy',
            territory: weakest.id,
            troops: Math.min(state.deployableTroops, 3)
        };
    }
    // Last resort: deploy to any owned territory (shouldn't happen often)
    const randomTerritory = selectRandom(ownedTerritories);
    return {
        type: 'deploy',
        territory: randomTerritory.id,
        troops: Math.min(state.deployableTroops, 3)
    };
}
export function getAIMove(state) {
    // Handle deploy phase with smart strategy
    if (state.phase === 'deploy') {
        return getSmartDeployment(state);
    }
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
