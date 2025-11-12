import type {
  GameState,
  Move,
  AttackMove,
  FortifyMove,
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
  const territoriesPerPlayer = Math.floor(42 / players.length);
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

  return {
    currentPlayer: players[0],
    players,
    phase: 'attack',
    territories: territoryMap,
    winner: null
  };
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

export function validateMove(state: GameState, move: Move): string | null {
  const { currentPlayer, phase, territories } = state;

  if (move.type === 'skip') {
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
    } else {
      newState.phase = 'attack';
      const currentIndex = newState.players.indexOf(newState.currentPlayer);
      newState.currentPlayer = newState.players[(currentIndex + 1) % newState.players.length];
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

    newState.phase = 'attack';
    const currentIndex = newState.players.indexOf(newState.currentPlayer);
    newState.currentPlayer = newState.players[(currentIndex + 1) % newState.players.length];

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
  const { currentPlayer, phase, territories } = state;

  moves.push({ type: 'skip' });

  if (phase === 'attack') {
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
