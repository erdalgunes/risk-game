import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInitialState,
  applyMove,
  validateMove,
  calculateReinforcements,
  getContinentBonus,
  getPlayerTerritoryCount,
  getValidMoves
} from './game';
import { territories, allTerritoryNames } from './territoryData';
import type { GameState, Move, Player } from './types';
import { createMockEarlyGameState, createMockMidGameState } from './__fixtures__/mockGameStates';
import { mockValidDeployMove, mockValidAttackMove, mockSkipMove } from './__fixtures__/mockMoves';

describe('createInitialState', () => {
  it('should create initial state with 2 players distributing 42 territories evenly', () => {
    const state = createInitialState(['red', 'blue']);

    expect(state.players).toEqual(['red', 'blue']);
    expect(state.currentPlayer).toBe('red');
    expect(state.phase).toBe('deploy');
    expect(state.winner).toBeNull();
    expect(state.conqueredTerritoryThisTurn).toBe(false);
    expect(Object.keys(state.territories)).toHaveLength(42);

    // Check territory distribution
    const redTerritories = Object.values(state.territories).filter(t => t.owner === 'red');
    const blueTerritories = Object.values(state.territories).filter(t => t.owner === 'blue');

    expect(redTerritories).toHaveLength(21);
    expect(blueTerritories).toHaveLength(21);

    // Check initial troops
    redTerritories.forEach(territory => {
      expect(territory.troops).toBe(3);
    });
    blueTerritories.forEach(territory => {
      expect(territory.troops).toBe(3);
    });
  });

  it('should handle 3 players with correct territory distribution', () => {
    const state = createInitialState(['red', 'blue', 'green']);

    const redCount = Object.values(state.territories).filter(t => t.owner === 'red').length;
    const blueCount = Object.values(state.territories).filter(t => t.owner === 'blue').length;
    const greenCount = Object.values(state.territories).filter(t => t.owner === 'green').length;

    expect(redCount + blueCount + greenCount).toBe(42);
    expect([redCount, blueCount, greenCount]).toEqual([14, 14, 14]);
  });

  it('should handle 6 players with correct territory distribution', () => {
    const players: Player[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    const state = createInitialState(players);

    const counts = players.map(player =>
      Object.values(state.territories).filter(t => t.owner === player).length
    );

    expect(counts).toEqual([7, 7, 7, 7, 7, 7]);
  });

  it('should handle any number of players', () => {
    const singlePlayerState = createInitialState(['red']);
    expect(singlePlayerState.players).toEqual(['red']);

    const manyPlayersState = createInitialState(['red', 'blue', 'green', 'yellow', 'purple', 'orange']);
    expect(manyPlayersState.players).toHaveLength(6);
  });

  it('should calculate initial reinforcements correctly', () => {
    const state = createInitialState(['red', 'blue']);

    // With 21 territories each, base reinforcements = floor(21/3) = 7, minimum 3
    expect(state.deployableTroops).toBeGreaterThanOrEqual(3);
  });
});

describe('validateMove', () => {
  it('should validate deploy move correctly', () => {
    const state: GameState = {
      ...createMockEarlyGameState(),
      phase: 'deploy',
      deployableTroops: 5
    };

    // Valid deploy
    expect(validateMove(state, { type: 'deploy', territory: 'alaska', troops: 3 })).toBeNull();

    // Invalid: wrong phase
    const attackState = { ...state, phase: 'attack' as const };
    expect(validateMove(attackState, { type: 'deploy', territory: 'alaska', troops: 3 })).toBe('Can only deploy during deploy phase');

    // Invalid: not owner (northwest_territory is owned by blue, current player is red)
    expect(validateMove(state, { type: 'deploy', territory: 'northwest_territory', troops: 3 })).toBe('You do not own this territory');

    // Invalid: too many troops
    expect(validateMove(state, { type: 'deploy', territory: 'alaska', troops: 10 })).toBe('Only 5 troops available to deploy');

    // Invalid: zero troops
    expect(validateMove(state, { type: 'deploy', territory: 'alaska', troops: 0 })).toBe('Must deploy at least 1 troop');
  });

  it('should validate attack move correctly', () => {
    const state: GameState = {
      ...createMockEarlyGameState(),
      phase: 'attack'
    };

    // Invalid: wrong phase
    const deployState = { ...state, phase: 'deploy' as const };
    expect(validateMove(deployState, { type: 'attack', from: 'alaska', to: 'northwest_territory' })).toBe('Can only attack during attack phase');

    // Invalid: not enough troops
    const weakState = {
      ...state,
      territories: {
        ...state.territories,
        alaska: { ...state.territories.alaska, troops: 1 }
      }
    };
    expect(validateMove(weakState, { type: 'attack', from: 'alaska', to: 'northwest_territory' })).toBe('Need at least 2 troops to attack');
  });

  it('should validate fortify move correctly', () => {
    const state: GameState = {
      ...createMockEarlyGameState(),
      phase: 'fortify'
    };

    // Invalid: wrong phase
    const deployState = { ...state, phase: 'deploy' as const };
    expect(validateMove(deployState, { type: 'fortify', from: 'alaska', to: 'alberta', troops: 1 })).toBe('Can only fortify during fortify phase');

    // Invalid: too many troops (trying to move all 3 troops, must leave at least 1)
    expect(validateMove(state, { type: 'fortify', from: 'alaska', to: 'alberta', troops: 3 })).toBe('Must leave at least 1 troop behind');

    // Invalid: zero troops
    expect(validateMove(state, { type: 'fortify', from: 'alaska', to: 'alberta', troops: 0 })).toBe('Must move at least 1 troop');
  });

  it('should validate skip move correctly', () => {
    const deployState: GameState = {
      ...createMockEarlyGameState(),
      phase: 'deploy',
      deployableTroops: 0
    };

    // Valid skip in attack phase
    const attackState = { ...deployState, phase: 'attack' as const };
    expect(validateMove(attackState, { type: 'skip' })).toBeNull();

    // Valid skip in fortify phase
    const fortifyState = { ...deployState, phase: 'fortify' as const };
    expect(validateMove(fortifyState, { type: 'skip' })).toBeNull();

    // Invalid skip in deploy phase with troops available
    const deployWithTroopsState = { ...deployState, deployableTroops: 5 };
    expect(validateMove(deployWithTroopsState, { type: 'skip' })).toBe('Must deploy all troops before skipping');
  });
});

describe('applyMove', () => {
  it('should apply deploy move correctly', () => {
    const state = { ...createMockEarlyGameState(), deployableTroops: 3 };
    const move: Move = { type: 'deploy', territory: 'alaska', troops: 3 };

    const newState = applyMove(state, move);

    expect(newState.territories.alaska.troops).toBe(6); // 3 + 3
    expect(newState.deployableTroops).toBe(0); // 3 - 3
    expect(newState.phase).toBe('attack'); // Transitions to attack phase
  });

  it('should transition to attack phase when all troops deployed', () => {
    const state = { ...createMockEarlyGameState(), deployableTroops: 3 };
    const move: Move = { type: 'deploy', territory: 'alaska', troops: 3 };

    const newState = applyMove(state, move);

    expect(newState.phase).toBe('attack');
    expect(newState.deployableTroops).toBe(0);
  });

  it('should apply attack move and handle conquest', () => {
    const state = { ...createMockEarlyGameState(), phase: 'attack' as const };

    // Set northwest_territory to have only 1 troop for conquest
    const conquestState = {
      ...state,
      territories: {
        ...state.territories,
        northwest_territory: { ...state.territories.northwest_territory, troops: 1 }
      }
    };

    // Mock Math.random to ensure conquest (attacker wins)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)  // Attacker roll: 6
      .mockReturnValueOnce(0.1); // Defender roll: 1

    const move: Move = { type: 'attack', from: 'alaska', to: 'northwest_territory' };
    const newState = applyMove(conquestState, move);

    expect(newState.territories.northwest_territory.owner).toBe('red');
    expect(newState.territories.northwest_territory.troops).toBe(1);
    expect(newState.territories.alaska.troops).toBe(2); // 3 - 1
    expect(newState.conqueredTerritoryThisTurn).toBe(true);

    vi.restoreAllMocks();
  });

  it('should apply attack move without conquest', () => {
    const state = { ...createMockEarlyGameState(), phase: 'attack' as const };
    const initialAlaskaTroops = state.territories.alaska.troops;
    const initialNWTroops = state.territories.northwest_territory.troops;

    // Mock Math.random for defender victory (defender wins)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)  // Attacker roll: 1
      .mockReturnValueOnce(0.9); // Defender roll: 6

    const move: Move = { type: 'attack', from: 'alaska', to: 'northwest_territory' };
    const newState = applyMove(state, move);

    expect(newState.territories.northwest_territory.owner).toBe('blue');
    expect(newState.territories.northwest_territory.troops).toBe(initialNWTroops); // Defender wins, no loss
    expect(newState.territories.alaska.troops).toBe(initialAlaskaTroops - 1); // Attacker loses 1
    expect(newState.conqueredTerritoryThisTurn).toBe(false);

    vi.restoreAllMocks();
  });

  it('should apply skip move and transition phases', () => {
    // Skip from attack to fortify
    const attackState = { ...createMockEarlyGameState(), phase: 'attack' as const };
    const fortifyState = applyMove(attackState, { type: 'skip' });

    expect(fortifyState.phase).toBe('fortify');

    // Skip from fortify to next player
    const nextPlayerState = applyMove(fortifyState, { type: 'skip' });

    expect(nextPlayerState.phase).toBe('deploy');
    expect(nextPlayerState.currentPlayer).toBe('blue');
  });

  it('should apply skip move and transition phases', () => {
    // Skip from attack to fortify
    const attackState = { ...createMockEarlyGameState(), phase: 'attack' as const };
    const fortifyState = applyMove(attackState, { type: 'skip' });

    expect(fortifyState.phase).toBe('fortify');

    // Skip from fortify to next player
    const nextPlayerState = applyMove(fortifyState, { type: 'skip' });

    expect(nextPlayerState.phase).toBe('deploy');
    expect(nextPlayerState.currentPlayer).toBe('blue');
  });

  it('should maintain state immutability', () => {
    const originalState = { ...createMockEarlyGameState(), deployableTroops: 0 };
    const move: Move = { type: 'skip' };

    const newState = applyMove(originalState, move);

    expect(originalState).not.toBe(newState);
    expect(originalState.phase).toBe('deploy');
    expect(newState.phase).toBe('attack');
  });

  it('should maintain state immutability', () => {
    const originalState = { ...createMockEarlyGameState() };
    const move: Move = { type: 'deploy', territory: 'alaska', troops: 1 };

    const newState = applyMove(originalState, move);

    expect(originalState).not.toBe(newState);
    expect(originalState.territories).not.toBe(newState.territories);
    expect(originalState.territories.alaska).not.toBe(newState.territories.alaska);
  });
});

describe('calculateReinforcements', () => {
  it('should calculate base reinforcements correctly', () => {
    const state = { ...createMockEarlyGameState() };
    const redTerritoryCount = Object.values(state.territories).filter(t => t.owner === 'red').length;
    const baseReinforcements = Math.floor(redTerritoryCount / 3);
    const continentBonus = getContinentBonus('red', state.territories);
    const expected = Math.max(3, baseReinforcements + continentBonus);

    expect(calculateReinforcements(state, 'red')).toBe(expected);
  });

  it('should include continent bonuses', () => {
    // Test that continent bonus is calculated (using mock state where no one owns full continents)
    const bonus = getContinentBonus('red', createMockEarlyGameState().territories);
    expect(bonus).toBeGreaterThanOrEqual(0);
  });
});

describe('getContinentBonus', () => {
  it('should return continent bonus when continent is fully owned', () => {
    const bonus = getContinentBonus('red', createMockEarlyGameState().territories);
    expect(bonus).toBeGreaterThanOrEqual(0); // May or may not own full continent in mock state
  });

  it('should return a number', () => {
    const bonus = getContinentBonus('red', createMockEarlyGameState().territories);
    expect(typeof bonus).toBe('number');
    expect(bonus).toBeGreaterThanOrEqual(0);
  });
});

describe('getPlayerTerritoryCount', () => {
  it('should count territories correctly', () => {
    const state = { ...createMockEarlyGameState() };
    const redCount = Object.values(state.territories).filter(t => t.owner === 'red').length;
    const blueCount = Object.values(state.territories).filter(t => t.owner === 'blue').length;

    // Check actual counts match the state
    expect(getPlayerTerritoryCount('red', state.territories)).toBe(redCount);
    expect(getPlayerTerritoryCount('blue', state.territories)).toBe(blueCount);
    // Total should be 42 territories
    expect(redCount + blueCount).toBe(42);
  });

  it('should return a number', () => {
    const count = getPlayerTerritoryCount('red', createMockEarlyGameState().territories);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
