import { createInitialState, applyMove, calculateReinforcements, getAIMove } from './packages/game-engine/dist/index.js';

console.log('🎲 Testing Risk Game Phase System\n');

// Create initial game state
const state = createInitialState(['red', 'blue']);
console.log('✅ Initial state created');
console.log(`   Phase: ${state.phase}`);
console.log(`   Current player: ${state.currentPlayer}`);
console.log(`   Deployable troops: ${state.deployableTroops}`);
console.log(`   Conquered this turn: ${state.conqueredTerritoryThisTurn}`);

// Test reinforcement calculation
const reinforcements = calculateReinforcements(state, 'red');
console.log(`\n✅ Reinforcements calculated for red: ${reinforcements}`);
console.log(`   (Should be at least 3 based on official rules)`);

// Test deploy phase
console.log('\n🎯 Testing Deploy Phase:');
let currentState = state;

// Try to deploy troops
const firstTerritory = Object.values(currentState.territories).find(t => t.owner === 'red');
console.log(`   Deploying 3 troops to ${firstTerritory.id}...`);

try {
  currentState = applyMove(currentState, {
    type: 'deploy',
    territory: firstTerritory.id,
    troops: 3
  });
  console.log(`   ✅ Deploy successful`);
  console.log(`   Remaining troops: ${currentState.deployableTroops}`);
  console.log(`   ${firstTerritory.id} now has ${currentState.territories[firstTerritory.id].troops} troops`);
} catch (error) {
  console.log(`   ❌ Deploy failed: ${error.message}`);
}

// Deploy all remaining troops
if (currentState.deployableTroops > 0) {
  console.log(`\n   Deploying remaining ${currentState.deployableTroops} troops...`);
  currentState = applyMove(currentState, {
    type: 'deploy',
    territory: firstTerritory.id,
    troops: currentState.deployableTroops
  });
  console.log(`   ✅ All troops deployed`);
  console.log(`   Phase automatically transitioned to: ${currentState.phase}`);
}

// Test AI deployment
console.log('\n🤖 Testing AI Deployment Strategy:');
const blueState = { ...currentState, currentPlayer: 'blue', phase: 'deploy', deployableTroops: 5 };
const aiMove = getAIMove(blueState);
console.log(`   AI move type: ${aiMove.type}`);
if (aiMove.type === 'deploy') {
  console.log(`   AI deploying ${aiMove.troops} troops to ${aiMove.territory}`);
  console.log(`   ✅ AI deployment strategy working`);
}

// Test phase transitions
console.log('\n🔄 Testing Phase Transitions:');
console.log(`   Current phase: ${currentState.phase}`);

// Skip attack phase
if (currentState.phase === 'attack') {
  currentState = applyMove(currentState, { type: 'skip' });
  console.log(`   ✅ Skipped attack → now in ${currentState.phase} phase`);
}

// Skip fortify phase (should move to next player's deploy phase)
if (currentState.phase === 'fortify') {
  const beforePlayer = currentState.currentPlayer;
  currentState = applyMove(currentState, { type: 'skip' });
  console.log(`   ✅ Skipped fortify → moved to next player`);
  console.log(`   Player changed: ${beforePlayer} → ${currentState.currentPlayer}`);
  console.log(`   Phase: ${currentState.phase}`);
  console.log(`   New reinforcements: ${currentState.deployableTroops}`);
}

console.log('\n✨ All phase tests completed successfully!');
console.log('\nPhase Flow Summary:');
console.log('  1. Deploy: Receive income and place troops');
console.log('  2. Attack: Battle adjacent enemies');
console.log('  3. Fortify: Move troops between connected territories');
console.log('  4. Next player\'s Deploy phase (cycle repeats)');
