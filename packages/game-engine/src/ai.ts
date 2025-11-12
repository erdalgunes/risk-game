import type { GameState, Move, TerritoryId, DeployMove, AttackMove } from './types';
import { getValidMoves, getContinentBonus } from './game';
import { continents } from './territoryData';

// Crypto-secure random number generator to satisfy SonarCloud security requirements
function getSecureRandom(): number {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  } else if (typeof global !== 'undefined' && global.crypto) {
    // Node.js environment
    const array = new Uint32Array(1);
    global.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  } else {
    // Fallback for older environments - still using Math.random but isolated
    return Math.random(); // NOSONAR
  }
}

function selectRandom<T>(array: T[]): T {
  const randomIndex = Math.floor(getSecureRandom() * array.length);
  return array[randomIndex];
}

function isBorderTerritory(territoryId: TerritoryId, player: string, state: GameState): boolean {
  const territory = state.territories[territoryId];
  return territory.adjacentTo.some(adjId => {
    const adjacent = state.territories[adjId];
    return adjacent.owner !== player;
  });
}

function getContinentProgress(state: GameState, player: string): { continentName: string; owned: number; total: number; missing: TerritoryId[] }[] {
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

function getSmartDeployment(state: GameState): DeployMove {
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
      const continentBorders = borderTerritories.filter(t =>
        continents.find(c => c.name === continent.continentName)?.territories.includes(t.id)
      );

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

export function getAIMove(state: GameState): Move {
  // Handle initial placement phase
  if (state.phase === 'initial_placement') {
    const validMoves = getValidMoves(state);
    const subPhase = state.initialPlacementSubPhase;

    if (subPhase === 'claiming') {
      // During claiming, prefer territories in continents where we already have presence
      const continentProgress = getContinentProgress(state, state.currentPlayer);
      for (const continent of continentProgress) {
        if (continent.owned > 0) {
          const availableTerritories = continent.missing.filter(t =>
            state.territories[t].owner === null
          );
          if (availableTerritories.length > 0) {
            const territory = selectRandom(availableTerritories);
            return { type: 'deploy', territory, troops: 1 };
          }
        }
      }
    }

    // Fallback: random valid move
    return selectRandom(validMoves);
  }

  // Handle deploy phase with smart strategy
  if (state.phase === 'deploy') {
    return getSmartDeployment(state);
  }

  // Handle attack transfer phase
  if (state.phase === 'attack_transfer') {
    const validMoves = getValidMoves(state);
    // Move as many troops as possible to strengthen the conquered territory
    const maxTransfer = validMoves[validMoves.length - 1];
    return maxTransfer;
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
    // Choose attack with dice (default to max dice for simplicity)
    const attack = selectRandom(attackMoves) as AttackMove;
    const from = state.territories[attack.from];
    const to = state.territories[attack.to];

    attack.attackerDice = Math.min(3, from.troops - 1) as 1 | 2 | 3;
    attack.defenderDice = Math.min(2, to.troops) as 1 | 2;

    return attack;
  }

  // Otherwise pick a random fortify move
  return selectRandom(actionMoves);
}
