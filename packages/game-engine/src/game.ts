import type {
  GameState,
  Move,
  AttackMove,
  FortifyMove,
  DeployMove,
  AttackResult,
  TerritoryId,
  Player,
  Territory
} from './types';
import { territories, continents, allTerritoryNames, type TerritoryName } from './territoryData';

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialState(players: Player[] = ['red', 'blue']): GameState {
  const shuffledTerritories = shuffle(allTerritoryNames);
  const initialTroops = 3;

  const territoryMap: Record<TerritoryId, Territory> = {} as Record<TerritoryId, Territory>;

  // Distribute territories among players
  shuffledTerritories.forEach((territoryName, index) => {
    const playerIndex = index % players.length;
    const territoryDef = territories[territoryName];

    territoryMap[territoryName] = {
      id: territoryName,
      name: territoryName,
      continent: territoryDef.continent,
      owner: players[playerIndex],
      troops: initialTroops,
      adjacentTo: territoryDef.neighbors
    };
  });

  const initialState: GameState = {
    currentPlayer: players[0],
    players,
    phase: 'deploy',
    territories: territoryMap,
    winner: null,
    deployableTroops: 0,
    conqueredTerritoryThisTurn: false
  };

  // Calculate initial reinforcements for the first player
  initialState.deployableTroops = calculateReinforcements(initialState, players[0]);

  return initialState;
}

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function resolveAttack(attackerTroops: number, defenderTroops: number): AttackResult {
  const attackerRoll = rollDice();
  const defenderRoll = rollDice();

  if (attackerRoll > defenderRoll) {
    return {
      attackerLost: 0,
      defenderLost: 1,
      conquered: defenderTroops === 1
    };
  } else {
    return {
      attackerLost: 1,
      defenderLost: 0,
      conquered: false
    };
  }
}

function isAdjacent(from: TerritoryId, to: TerritoryId, territoryMap: Record<TerritoryId, Territory>): boolean {
  return territoryMap[from].adjacentTo.includes(to);
}

function areConnected(from: TerritoryId, to: TerritoryId, owner: Player, territoryMap: Record<TerritoryId, Territory>): boolean {
  const visited = new Set<TerritoryId>();
  const queue: TerritoryId[] = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const adjacent = territoryMap[current].adjacentTo.filter(
      id => territoryMap[id].owner === owner
    );
    queue.push(...adjacent);
  }

  return false;
}

export function getContinentBonus(player: Player, territoryMap: Record<TerritoryId, Territory>): number {
  let bonus = 0;

  for (const continent of continents) {
    const ownsAllTerritories = continent.territories.every(
      territoryName => territoryMap[territoryName].owner === player
    );

    if (ownsAllTerritories) {
      bonus += continent.bonus;
    }
  }

  return bonus;
}

export function getPlayerTerritoryCount(player: Player, territoryMap: Record<TerritoryId, Territory>): number {
  return Object.values(territoryMap).filter(t => t.owner === player).length;
}

export function calculateReinforcements(state: GameState, player: Player): number {
  const territoryCount = getPlayerTerritoryCount(player, state.territories);
  const continentBonus = getContinentBonus(player, state.territories);

  // Base reinforcements: territories ÷ 3 (round down)
  const baseReinforcements = Math.floor(territoryCount / 3);

  // Total reinforcements with continent bonus, minimum 3
  const totalReinforcements = baseReinforcements + continentBonus;

  return Math.max(3, totalReinforcements);
}

export function validateMove(state: GameState, move: Move): string | null {
  const { currentPlayer, phase, territories, deployableTroops } = state;

  if (move.type === 'skip') {
    // Cannot skip deploy phase if there are troops to deploy
    if (phase === 'deploy' && deployableTroops > 0) {
      return 'Must deploy all troops before skipping';
    }
    return null;
  }

  if (move.type === 'deploy') {
    if (phase !== 'deploy') {
      return 'Can only deploy during deploy phase';
    }

    const territory = territories[move.territory];

    if (territory.owner !== currentPlayer) {
      return 'You do not own this territory';
    }

    if (move.troops < 1) {
      return 'Must deploy at least 1 troop';
    }

    if (move.troops > deployableTroops) {
      return `Only ${deployableTroops} troops available to deploy`;
    }

    return null;
  }

  if (move.type === 'attack') {
    if (phase !== 'attack') {
      return 'Can only attack during attack phase';
    }

    const from = territories[move.from];
    const to = territories[move.to];

    if (from.owner !== currentPlayer) {
      return 'You do not own the attacking territory';
    }

    if (to.owner === currentPlayer) {
      return 'Cannot attack your own territory';
    }

    if (from.troops <= 1) {
      return 'Need at least 2 troops to attack';
    }

    if (!isAdjacent(move.from, move.to, territories)) {
      return 'Territories are not adjacent';
    }

    return null;
  }

  if (move.type === 'fortify') {
    if (phase !== 'fortify') {
      return 'Can only fortify during fortify phase';
    }

    const from = territories[move.from];
    const to = territories[move.to];

    if (from.owner !== currentPlayer) {
      return 'You do not own the source territory';
    }

    if (to.owner !== currentPlayer) {
      return 'You do not own the destination territory';
    }

    if (move.troops < 1) {
      return 'Must move at least 1 troop';
    }

    if (from.troops <= move.troops) {
      return 'Must leave at least 1 troop behind';
    }

    if (!areConnected(move.from, move.to, currentPlayer, territories)) {
      return 'Territories are not connected through your territories';
    }

    return null;
  }

  return 'Invalid move type';
}

export function applyMove(state: GameState, move: Move): GameState {
  const error = validateMove(state, move);
  if (error) {
    throw new Error(error);
  }

  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  if (move.type === 'skip') {
    if (newState.phase === 'attack') {
      newState.phase = 'fortify';
    } else if (newState.phase === 'fortify') {
      // End turn, move to next player
      const currentIndex = newState.players.indexOf(newState.currentPlayer);
      newState.currentPlayer = newState.players[(currentIndex + 1) % newState.players.length];
      newState.phase = 'deploy';
      newState.conqueredTerritoryThisTurn = false;
      newState.deployableTroops = calculateReinforcements(newState, newState.currentPlayer);
    }
    return newState;
  }

  if (move.type === 'deploy') {
    const territory = newState.territories[move.territory];

    territory.troops += move.troops;
    newState.deployableTroops -= move.troops;

    // Auto-transition to attack phase when all troops are deployed
    if (newState.deployableTroops === 0) {
      newState.phase = 'attack';
    }

    return newState;
  }

  if (move.type === 'attack') {
    const from = newState.territories[move.from];
    const to = newState.territories[move.to];

    const result = resolveAttack(from.troops, to.troops);

    from.troops -= result.attackerLost;
    to.troops -= result.defenderLost;

    if (result.conquered) {
      to.owner = from.owner;
      to.troops = 1;
      from.troops -= 1;
      newState.conqueredTerritoryThisTurn = true;
    }

    const winner = checkWinner(newState.territories, newState.players);
    if (winner) {
      newState.winner = winner;
    }

    return newState;
  }

  if (move.type === 'fortify') {
    const from = newState.territories[move.from];
    const to = newState.territories[move.to];

    from.troops -= move.troops;
    to.troops += move.troops;

    // End turn, move to next player
    const currentIndex = newState.players.indexOf(newState.currentPlayer);
    newState.currentPlayer = newState.players[(currentIndex + 1) % newState.players.length];
    newState.phase = 'deploy';
    newState.conqueredTerritoryThisTurn = false;
    newState.deployableTroops = calculateReinforcements(newState, newState.currentPlayer);

    return newState;
  }

  return newState;
}

function checkWinner(territoryMap: Record<TerritoryId, Territory>, players: Player[]): Player | null {
  for (const player of players) {
    const ownedCount = getPlayerTerritoryCount(player, territoryMap);
    if (ownedCount === 42) {
      return player;
    }
  }
  return null;
}

export function getValidMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const { currentPlayer, phase, territories, deployableTroops } = state;

  // Can only skip if not in deploy phase or if all troops are deployed
  if (phase !== 'deploy' || deployableTroops === 0) {
    moves.push({ type: 'skip' });
  }

  if (phase === 'deploy') {
    // Generate deploy moves for all owned territories
    for (const territoryId in territories) {
      const territory = territories[territoryId as TerritoryId];
      if (territory.owner === currentPlayer) {
        // Allow deploying 1 troop at a time, or all remaining troops
        moves.push({
          type: 'deploy',
          territory: territory.id,
          troops: 1
        });
        if (deployableTroops > 1) {
          moves.push({
            type: 'deploy',
            territory: territory.id,
            troops: deployableTroops
          });
        }
      }
    }
  } else if (phase === 'attack') {
    for (const territoryId in territories) {
      const from = territories[territoryId as TerritoryId];
      if (from.owner === currentPlayer && from.troops > 1) {
        for (const toId of from.adjacentTo) {
          const to = territories[toId];
          if (to.owner !== currentPlayer) {
            moves.push({
              type: 'attack',
              from: from.id,
              to: toId
            });
          }
        }
      }
    }
  } else {
    for (const territoryId in territories) {
      const from = territories[territoryId as TerritoryId];
      if (from.owner === currentPlayer && from.troops > 1) {
        for (const toId in territories) {
          const to = territories[toId as TerritoryId];
          if (to.owner === currentPlayer && from.id !== to.id) {
            if (areConnected(from.id, to.id, currentPlayer, territories)) {
              for (let troops = 1; troops < from.troops; troops++) {
                moves.push({
                  type: 'fortify',
                  from: from.id,
                  to: to.id,
                  troops
                });
              }
            }
          }
        }
      }
    }
  }

  return moves;
}
