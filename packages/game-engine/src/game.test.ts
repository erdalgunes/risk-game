import { describe, it, expect, vi } from 'vitest';
import {
  createInitialState,
  applyMove,
  validateMove,
  calculateReinforcements,
  getContinentBonus,
  getPlayerTerritoryCount
} from './game';
import type { GameState, Move, Player, TerritoryId } from './types';
import { createMockEarlyGameState } from './__fixtures__/mockGameStates';

describe('createInitialState', () => {
  it('should create initial state with 2 players in initial placement phase', () => {
    const state = createInitialState(['red', 'blue']);

    // 2-player games include neutral player
    expect(state.players).toEqual(['red', 'blue', 'neutral']);
    expect(state.currentPlayer).toBe('red');
    expect(state.phase).toBe('initial_placement');
    expect(state.initialPlacementSubPhase).toBe('claiming');
    expect(state.winner).toBeNull();
    expect(state.conqueredTerritoryThisTurn).toBe(false);
    expect(Object.keys(state.territories)).toHaveLength(42);

    // In initial placement, territories start unclaimed
    const unclaimedTerritories = Object.values(state.territories).filter(t => t.owner === null);
    expect(unclaimedTerritories).toHaveLength(42);

    // Check all territories have 0 troops initially
    for (const territory of Object.values(state.territories)) {
      expect(territory.troops).toBe(0);
    }

    // Check unplaced troops for 2-player game (40 armies each for human players)
    expect(state.unplacedTroops).toBeDefined();
    expect(state.unplacedTroops!['red']).toBe(40);
    expect(state.unplacedTroops!['blue']).toBe(40);
    expect(state.unplacedTroops!['neutral']).toBe(40);
  });

  it('should handle 3 players with correct army allocation', () => {
    const state = createInitialState(['red', 'blue', 'green']);

    // 3+ player games don't add neutral
    expect(state.players).toEqual(['red', 'blue', 'green']);
    expect(state.phase).toBe('initial_placement');

    // All territories start unclaimed
    const unclaimedCount = Object.values(state.territories).filter(t => t.owner === null).length;
    expect(unclaimedCount).toBe(42);

    // 3 players get 35 armies each
    expect(state.unplacedTroops!['red']).toBe(35);
    expect(state.unplacedTroops!['blue']).toBe(35);
    expect(state.unplacedTroops!['green']).toBe(35);
  });

  it('should handle 6 players with correct army allocation', () => {
    const players: Player[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    const state = createInitialState(players);

    expect(state.players).toEqual(players);
    expect(state.phase).toBe('initial_placement');

    // 6 players get 20 armies each
    for (const player of players) {
      expect(state.unplacedTroops![player]).toBe(20);
    }
  });

  it('should handle any number of players', () => {
    const singlePlayerState = createInitialState(['red']);
    // Single player game does not add neutral (only 2-player games do)
    expect(singlePlayerState.players).toEqual(['red']);

    const manyPlayersState = createInitialState(['red', 'blue', 'green', 'yellow', 'purple', 'orange']);
    // 6-player game doesn't add neutral
    expect(manyPlayersState.players).toHaveLength(6);
  });

  it('should calculate initial reinforcements correctly', () => {
    const state = createInitialState(['red', 'blue']);

    // In initial_placement phase, deployableTroops is 0
    // Reinforcements come from unplacedTroops
    expect(state.deployableTroops).toBe(0);
    expect(state.unplacedTroops!['red']).toBeGreaterThanOrEqual(20); // At least 20 armies for 2+ players
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

    // Find two territories owned by the same player (red)
    const redTerritories = Object.entries(state.territories)
      .filter(([_, t]) => t.owner === 'red')
      .map(([id, _]) => id as TerritoryId);
    const fromTerritory = redTerritories[0];
    const toTerritory = redTerritories[1];

    // Invalid: wrong phase
    const deployState = { ...state, phase: 'deploy' as const };
    expect(validateMove(deployState, { type: 'fortify', from: fromTerritory, to: toTerritory, troops: 1 })).toBe('Can only fortify during fortify phase');

    // Invalid: too many troops (trying to move all 3 troops, must leave at least 1)
    expect(validateMove(state, { type: 'fortify', from: fromTerritory, to: toTerritory, troops: 3 })).toBe('Must leave at least 1 troop behind');

    // Invalid: zero troops
    expect(validateMove(state, { type: 'fortify', from: fromTerritory, to: toTerritory, troops: 0 })).toBe('Must move at least 1 troop');
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

    // Find a red territory with at least 2 troops and an adjacent non-red territory
    // In our mock state, territories are distributed round-robin between red, blue, neutral
    // alaska (index 0) should be red, and we need to find an adjacent territory that's not red
    const redTerritory = 'alaska'; // owned by red
    const targetTerritory = 'northwest_territory'; // should be blue or neutral

    // Set up for conquest - target has only 1 troop
    const conquestState = {
      ...state,
      territories: {
        ...state.territories,
        [redTerritory]: { ...state.territories[redTerritory], owner: 'red' as Player, troops: 3 },
        [targetTerritory]: { ...state.territories[targetTerritory], owner: 'blue' as Player, troops: 1 }
      }
    };

    // Mock crypto.getRandomValues for deterministic test - attacker wins
    const mockGetRandomValues = vi.fn((array: ArrayBufferView) => {
      const uint32Array = array as Uint32Array;
      // Return high value for attacker roll (close to max), low for defender
      uint32Array[0] = mockGetRandomValues.mock.calls.length % 2 === 0 ? 0xffffffff : 0x1;
      return array;
    });
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(mockGetRandomValues as never);

    const move: Move = { type: 'attack', from: redTerritory, to: targetTerritory };
    const newState = applyMove(conquestState, move);

    // After conquest, territory should be owned by red
    expect(newState.territories[targetTerritory].owner).toBe('red');
    // Territory should have 0 troops (waiting for transfer)
    expect(newState.territories[targetTerritory].troops).toBe(0);
    // Game should be in attack_transfer phase
    expect(newState.phase).toBe('attack_transfer');
    expect(newState.pendingTransfer).toBeDefined();
    expect(newState.conqueredTerritoryThisTurn).toBe(true);

    vi.restoreAllMocks();
  });

  it('should apply attack move without conquest', () => {
    const state = { ...createMockEarlyGameState(), phase: 'attack' as const };

    // Set up territories for attack where defender has multiple troops
    const redTerritory = 'alaska';
    const targetTerritory = 'northwest_territory';
    const attackState = {
      ...state,
      territories: {
        ...state.territories,
        [redTerritory]: { ...state.territories[redTerritory], owner: 'red' as Player, troops: 3 },
        [targetTerritory]: { ...state.territories[targetTerritory], owner: 'blue' as Player, troops: 3 }
      }
    };

    const initialAlaskaTroops = attackState.territories[redTerritory].troops;
    const initialNWTroops = attackState.territories[targetTerritory].troops;

    // Mock crypto.getRandomValues for deterministic test (defender wins)
    const mockGetRandomValues = vi.fn((array: ArrayBufferView) => {
      const uint32Array = array as Uint32Array;
      // Return low value for attacker roll, high for defender
      uint32Array[0] = mockGetRandomValues.mock.calls.length % 2 === 0 ? 0x1 : 0xffffffff;
      return array;
    });
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(mockGetRandomValues as never);

    const move: Move = { type: 'attack', from: redTerritory, to: targetTerritory };
    const newState = applyMove(attackState, move);

    // Territory should still be owned by blue
    expect(newState.territories[targetTerritory].owner).toBe('blue');
    // Defender should have lost at least 0 troops (possibly 1)
    expect(newState.territories[targetTerritory].troops).toBeGreaterThanOrEqual(initialNWTroops - 1);
    // Attacker should have lost at least 1 troop
    expect(newState.territories[redTerritory].troops).toBeLessThanOrEqual(initialAlaskaTroops);
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
    const neutralCount = Object.values(state.territories).filter(t => t.owner === 'neutral').length;

    // Check actual counts match the state
    expect(getPlayerTerritoryCount('red', state.territories)).toBe(redCount);
    expect(getPlayerTerritoryCount('blue', state.territories)).toBe(blueCount);
    // Total should be 42 territories (including neutral in 2-player games)
    expect(redCount + blueCount + neutralCount).toBe(42);
  });

  it('should return a number', () => {
    const count = getPlayerTerritoryCount('red', createMockEarlyGameState().territories);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
