#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Risk Game Phase System
 * Tests all edge cases and verifies complete turn cycles
 */

import { createInitialState, applyMove, calculateReinforcements, validateMove, getAIMove } from './packages/game-engine/dist/index.js';
import { types } from './packages/game-engine/dist/types.js';
import { game } from './packages/game-engine/dist/game.js';
import { ai } from './packages/game-engine/dist/ai.js';
import { territoryData } from './packages/game-engine/dist/territoryData.js';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🎲 Comprehensive Risk Game Phase System Tests\n');
console.log('═══════════════════════════════════════════════\n');

// =============================================================================
// Test Suite 1: Initial State
// =============================================================================
console.log('📋 Test Suite 1: Initial State\n');

test('Initial state starts in deploy phase', () => {
  const state = createInitialState(['red', 'blue']);
  assert(state.phase === 'deploy', `Expected 'deploy', got '${state.phase}'`);
});

test('Initial state has deployable troops', () => {
  const state = createInitialState(['red', 'blue']);
  assert(state.deployableTroops > 0, 'Should have troops to deploy');
  assert(state.deployableTroops >= 3, 'Should have at least 3 troops (minimum)');
});

test('Initial state has conqueredTerritoryThisTurn = false', () => {
  const state = createInitialState(['red', 'blue']);
  assert(state.conqueredTerritoryThisTurn === false, 'Should start with no conquests');
});

test('First player is set correctly', () => {
  const state = createInitialState(['red', 'blue']);
  assert(state.currentPlayer === 'red', 'First player should be red');
});

// =============================================================================
// Test Suite 2: Reinforcement Calculation
// =============================================================================
console.log('\n📋 Test Suite 2: Reinforcement Calculation\n');

test('Minimum 3 troops reinforcement', () => {
  const state = createInitialState(['red', 'blue']);
  const reinforcements = calculateReinforcements(state, 'red');
  assert(reinforcements >= 3, `Got ${reinforcements}, expected at least 3`);
});

test('Reinforcement scales with territory count', () => {
  const state = createInitialState(['red', 'blue']);
  const redTerritories = Object.values(state.territories).filter(t => t.owner === 'red').length;
  const expectedBase = Math.floor(redTerritories / 3);
  const reinforcements = calculateReinforcements(state, 'red');
  // Should be at least the base (could be higher with continent bonuses)
  assert(reinforcements >= Math.max(3, expectedBase),
    `Expected at least ${Math.max(3, expectedBase)}, got ${reinforcements}`);
});

// =============================================================================
// Test Suite 3: Deploy Phase Validation
// =============================================================================
console.log('\n📋 Test Suite 3: Deploy Phase Validation\n');

test('Can deploy to owned territory', () => {
  const state = createInitialState(['red', 'blue']);
  const ownedTerritory = Object.values(state.territories).find(t => t.owner === 'red');
  const error = validateMove(state, {
    type: 'deploy',
    territory: ownedTerritory.id,
    troops: 1
  });
  assert(error === null, `Unexpected error: ${error}`);
});

test('Cannot deploy to enemy territory', () => {
  const state = createInitialState(['red', 'blue']);
  const enemyTerritory = Object.values(state.territories).find(t => t.owner === 'blue');
  const error = validateMove(state, {
    type: 'deploy',
    territory: enemyTerritory.id,
    troops: 1
  });
  assert(error !== null, 'Should not allow deploying to enemy territory');
  assert(error.includes('do not own'), `Expected ownership error, got: ${error}`);
});

test('Cannot deploy more troops than available', () => {
  const state = createInitialState(['red', 'blue']);
  const ownedTerritory = Object.values(state.territories).find(t => t.owner === 'red');
  const error = validateMove(state, {
    type: 'deploy',
    territory: ownedTerritory.id,
    troops: state.deployableTroops + 1
  });
  assert(error !== null, 'Should not allow deploying more than available');
  assert(error.includes('available'), `Expected availability error, got: ${error}`);
});

test('Cannot deploy 0 troops', () => {
  const state = createInitialState(['red', 'blue']);
  const ownedTerritory = Object.values(state.territories).find(t => t.owner === 'red');
  const error = validateMove(state, {
    type: 'deploy',
    territory: ownedTerritory.id,
    troops: 0
  });
  assert(error !== null, 'Should not allow deploying 0 troops');
  assert(error.includes('at least 1'), `Expected minimum error, got: ${error}`);
});

test('Cannot skip deploy phase with troops remaining', () => {
  const state = createInitialState(['red', 'blue']);
  const error = validateMove(state, { type: 'skip' });
  assert(error !== null, 'Should not allow skipping with troops remaining');
  assert(error.includes('deploy all'), `Expected deploy requirement error, got: ${error}`);
});

// =============================================================================
// Test Suite 4: Deploy Phase Execution
// =============================================================================
console.log('\n📋 Test Suite 4: Deploy Phase Execution\n');

test('Deploy move adds troops to territory', () => {
  const state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');
  const initialTroops = territory.troops;

  const newState = applyMove(state, {
    type: 'deploy',
    territory: territory.id,
    troops: 2
  });

  assert(newState.territories[territory.id].troops === initialTroops + 2,
    `Expected ${initialTroops + 2} troops, got ${newState.territories[territory.id].troops}`);
});

test('Deploy move reduces deployableTroops', () => {
  const state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');
  const initialDeployable = state.deployableTroops;

  const newState = applyMove(state, {
    type: 'deploy',
    territory: territory.id,
    troops: 2
  });

  assert(newState.deployableTroops === initialDeployable - 2,
    `Expected ${initialDeployable - 2} deployable, got ${newState.deployableTroops}`);
});

test('Auto-transition to attack when all troops deployed', () => {
  const state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');

  const newState = applyMove(state, {
    type: 'deploy',
    territory: territory.id,
    troops: state.deployableTroops
  });

  assert(newState.phase === 'attack', `Expected 'attack', got '${newState.phase}'`);
  assert(newState.deployableTroops === 0, 'Should have 0 deployable troops');
});

test('Stays in deploy phase if troops remaining', () => {
  const state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');

  if (state.deployableTroops > 1) {
    const newState = applyMove(state, {
      type: 'deploy',
      territory: territory.id,
      troops: 1
    });

    assert(newState.phase === 'deploy', `Expected 'deploy', got '${newState.phase}'`);
    assert(newState.deployableTroops > 0, 'Should still have troops to deploy');
  }
});

// =============================================================================
// Test Suite 5: Phase Transitions
// =============================================================================
console.log('\n📋 Test Suite 5: Phase Transitions\n');

test('Skip in attack phase moves to fortify', () => {
  let state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');

  // Deploy all troops to get to attack phase
  state = applyMove(state, {
    type: 'deploy',
    territory: territory.id,
    troops: state.deployableTroops
  });

  assert(state.phase === 'attack', 'Should be in attack phase');

  state = applyMove(state, { type: 'skip' });
  assert(state.phase === 'fortify', `Expected 'fortify', got '${state.phase}'`);
  assert(state.currentPlayer === 'red', 'Should still be same player');
});

test('Skip in fortify phase moves to next player deploy', () => {
  let state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');

  // Get to fortify phase
  state = applyMove(state, {
    type: 'deploy',
    territory: territory.id,
    troops: state.deployableTroops
  });
  state = applyMove(state, { type: 'skip' }); // attack -> fortify

  assert(state.phase === 'fortify', 'Should be in fortify phase');

  state = applyMove(state, { type: 'skip' }); // fortify -> next player deploy

  assert(state.currentPlayer === 'blue', 'Should be blue\'s turn');
  assert(state.phase === 'deploy', `Expected 'deploy', got '${state.phase}'`);
  assert(state.deployableTroops > 0, 'New player should have troops to deploy');
  assert(state.conqueredTerritoryThisTurn === false, 'Should reset conquest flag');
});

test('Fortify move ends turn and moves to next player deploy', () => {
  let state = createInitialState(['red', 'blue']);

  // Get to fortify phase
  const deployTerritory = Object.values(state.territories).find(t => t.owner === 'red');
  state = applyMove(state, {
    type: 'deploy',
    territory: deployTerritory.id,
    troops: state.deployableTroops
  });
  state = applyMove(state, { type: 'skip' }); // to fortify

  // Find two connected territories owned by red
  const fromTerritory = Object.values(state.territories).find(t => t.owner === 'red' && t.troops > 1);
  const toTerritory = Object.values(state.territories).find(t =>
    t.owner === 'red' &&
    t.id !== fromTerritory.id &&
    fromTerritory.adjacentTo.includes(t.id)
  );

  if (fromTerritory && toTerritory) {
    state = applyMove(state, {
      type: 'fortify',
      from: fromTerritory.id,
      to: toTerritory.id,
      troops: 1
    });

    assert(state.currentPlayer === 'blue', 'Should be blue\'s turn');
    assert(state.phase === 'deploy', `Expected 'deploy', got '${state.phase}'`);
    assert(state.deployableTroops > 0, 'New player should have troops to deploy');
  }
});

// =============================================================================
// Test Suite 6: AI Strategy
// =============================================================================
console.log('\n📋 Test Suite 6: AI Strategy\n');

test('AI generates deploy move in deploy phase', () => {
  const state = createInitialState(['red', 'blue']);
  // Change to blue's turn
  const blueState = { ...state, currentPlayer: 'blue', deployableTroops: 5 };

  const aiMove = getAIMove(blueState);
  assert(aiMove.type === 'deploy', `Expected 'deploy', got '${aiMove.type}'`);
  assert(aiMove.territory, 'AI should specify territory');
  assert(aiMove.troops > 0, 'AI should deploy at least 1 troop');
  assert(aiMove.troops <= 5, 'AI should not deploy more than available');
});

test('AI deploy move is valid', () => {
  const state = createInitialState(['red', 'blue']);
  const blueState = { ...state, currentPlayer: 'blue', deployableTroops: 5 };

  const aiMove = getAIMove(blueState);
  const error = validateMove(blueState, aiMove);

  assert(error === null, `AI generated invalid move: ${error}`);
});

test('AI deploys to owned territory', () => {
  const state = createInitialState(['red', 'blue']);
  const blueState = { ...state, currentPlayer: 'blue', deployableTroops: 5 };

  const aiMove = getAIMove(blueState);
  const territory = blueState.territories[aiMove.territory];

  assert(territory.owner === 'blue', 'AI should deploy to its own territory');
});

// =============================================================================
// Test Suite 7: Complete Turn Cycle
// =============================================================================
console.log('\n📋 Test Suite 7: Complete Turn Cycle\n');

test('Complete turn cycle: red deploys -> attacks -> fortifies -> blue\'s turn', () => {
  let state = createInitialState(['red', 'blue']);

  // Phase 1: Deploy
  assert(state.phase === 'deploy' && state.currentPlayer === 'red', 'Start in red deploy');
  const deployTerritory = Object.values(state.territories).find(t => t.owner === 'red');
  state = applyMove(state, {
    type: 'deploy',
    territory: deployTerritory.id,
    troops: state.deployableTroops
  });

  // Phase 2: Attack (skip)
  assert(state.phase === 'attack' && state.currentPlayer === 'red', 'Auto-transition to attack');
  state = applyMove(state, { type: 'skip' });

  // Phase 3: Fortify (skip)
  assert(state.phase === 'fortify' && state.currentPlayer === 'red', 'Skip to fortify');
  state = applyMove(state, { type: 'skip' });

  // Phase 4: Next player deploy
  assert(state.phase === 'deploy' && state.currentPlayer === 'blue', 'Blue deploy phase');
  assert(state.deployableTroops > 0, 'Blue has troops to deploy');
});

test('Multiple deploy moves in single phase', () => {
  let state = createInitialState(['red', 'blue']);
  const territory = Object.values(state.territories).find(t => t.owner === 'red');
  const initialDeployable = state.deployableTroops;

  // Deploy in chunks
  state = applyMove(state, { type: 'deploy', territory: territory.id, troops: 1 });
  assert(state.phase === 'deploy', 'Should stay in deploy');
  assert(state.deployableTroops === initialDeployable - 1, 'Troops reduced by 1');

  state = applyMove(state, { type: 'deploy', territory: territory.id, troops: 1 });
  assert(state.phase === 'deploy', 'Should stay in deploy');
  assert(state.deployableTroops === initialDeployable - 2, 'Troops reduced by 2');

  // Deploy remaining
  state = applyMove(state, {
    type: 'deploy',
    territory: territory.id,
    troops: state.deployableTroops
  });
  assert(state.phase === 'attack', 'Should transition to attack');
  assert(state.deployableTroops === 0, 'All troops deployed');
});

// =============================================================================
// Results
// =============================================================================
console.log('\n═══════════════════════════════════════════════');
console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed === 0) {
  console.log('\n✨ All tests passed! The implementation looks solid.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed. Review the errors above.\n`);
  process.exit(1);
}
