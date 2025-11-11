/**
 * Game state management and core game logic
 */

import type { GameState, Player, TerritoryId, GamePhase } from './types';
import { createInitialTerritories } from './map';
import { resolveCombat } from './combat';
import { validateAttack, validateFortify, checkWinner } from './validation';

/**
 * Create a new game with initial setup
 */
export function createGame(
  gameId: string,
  player1Name: string,
  player2Name: string,
  mode: 'single-player' | 'multiplayer'
): GameState {
  const player1: Player = {
    id: 'player-red',
    color: 'red',
    name: player1Name,
    isAI: false,
  };

  const player2: Player = {
    id: 'player-blue',
    color: 'blue',
    name: player2Name,
    isAI: mode === 'single-player',
  };

  return {
    id: gameId,
    players: [player1, player2],
    territories: createInitialTerritories(player1.id, player2.id),
    currentPlayerIndex: 0,
    phase: 'attack',
    winner: null,
    mode,
  };
}

/**
 * Execute an attack
 */
export function executeAttack(
  gameState: GameState,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId
): {
  updatedState: GameState;
  result: ReturnType<typeof resolveCombat>;
  error?: string;
} {
  // Validate attack
  const validation = validateAttack(gameState, fromTerritoryId, toTerritoryId);
  if (!validation.valid) {
    return {
      updatedState: gameState,
      result: null as any,
      error: validation.error,
    };
  }

  const fromTerritory = gameState.territories.find((t) => t.id === fromTerritoryId)!;
  const toTerritory = gameState.territories.find((t) => t.id === toTerritoryId)!;

  // Resolve combat
  const result = resolveCombat(fromTerritory.troops, toTerritory.troops);

  // Update troop counts
  const updatedTerritories = gameState.territories.map((t) => {
    if (t.id === fromTerritoryId) {
      return { ...t, troops: t.troops - result.attackerLoss };
    }
    if (t.id === toTerritoryId) {
      const newTroops = t.troops - result.defenderLoss;
      // If conquered, transfer minimum 1 troop from attacker
      if (newTroops === 0) {
        return {
          ...t,
          ownerId: fromTerritory.ownerId,
          troops: 1,
        };
      }
      return { ...t, troops: newTroops };
    }
    return t;
  });

  // If conquered, move 1 troop from attacker to conquered territory
  if (result.conquered) {
    const attackerIndex = updatedTerritories.findIndex((t) => t.id === fromTerritoryId);
    updatedTerritories[attackerIndex] = {
      ...updatedTerritories[attackerIndex],
      troops: updatedTerritories[attackerIndex].troops - 1,
    };
  }

  const updatedState: GameState = {
    ...gameState,
    territories: updatedTerritories,
  };

  // Check for winner
  const winner = checkWinner(updatedState);
  if (winner) {
    updatedState.winner = winner;
  }

  return { updatedState, result };
}

/**
 * Execute a fortify move
 */
export function executeFortify(
  gameState: GameState,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId,
  troopCount: number
): {
  updatedState: GameState;
  error?: string;
} {
  // Validate fortify
  const validation = validateFortify(gameState, fromTerritoryId, toTerritoryId, troopCount);
  if (!validation.valid) {
    return {
      updatedState: gameState,
      error: validation.error,
    };
  }

  // Update troop counts
  const updatedTerritories = gameState.territories.map((t) => {
    if (t.id === fromTerritoryId) {
      return { ...t, troops: t.troops - troopCount };
    }
    if (t.id === toTerritoryId) {
      return { ...t, troops: t.troops + troopCount };
    }
    return t;
  });

  return {
    updatedState: {
      ...gameState,
      territories: updatedTerritories,
    },
  };
}

/**
 * Change game phase
 */
export function changePhase(gameState: GameState, newPhase: GamePhase): GameState {
  return {
    ...gameState,
    phase: newPhase,
  };
}

/**
 * End current player's turn
 */
export function endTurn(gameState: GameState): GameState {
  return {
    ...gameState,
    currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length,
    phase: 'attack',
  };
}

/**
 * Get current player
 */
export function getCurrentPlayer(gameState: GameState): Player {
  return gameState.players[gameState.currentPlayerIndex];
}
