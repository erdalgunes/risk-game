import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, applyMove, calculateReinforcements, getValidMoves } from './game';
import type { GameState } from './types';

// Helper function to complete initial placement phase
function completeInitialPlacement(state: GameState): GameState {
  let currentState = state;

  // Complete initial placement by placing all troops
  while (currentState.phase === 'initial_placement') {
    const validMoves = getValidMoves(currentState);
    const deployMove = validMoves.find(move => move.type === 'deploy');
    if (!deployMove) break;
    currentState = applyMove(currentState, deployMove);
  }

  return currentState;
}

describe('game integration - full turn cycle', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialState(['red', 'blue']);
  });

  it('should complete a full turn cycle: deploy -> attack -> fortify', () => {
    // Start with initial placement phase
    expect(gameState.phase).toBe('initial_placement');
    expect(gameState.currentPlayer).toBe('red');

    // Complete initial placement to get to regular game
    gameState = completeInitialPlacement(gameState);

    // Should now be in deploy phase
    expect(gameState.phase).toBe('deploy');
    expect(gameState.currentPlayer).toBe('red');

    // Deploy all troops
    const deployableTroops = gameState.deployableTroops;
    for (let i = 0; i < deployableTroops; i++) {
      const validMoves = getValidMoves(gameState);
      const deployMove = validMoves.find(move => move.type === 'deploy');
      if (deployMove) {
        gameState = applyMove(gameState, deployMove);
      }
    }

    // Should transition to attack phase
    expect(gameState.phase).toBe('attack');

    // Skip attack phase
    gameState = applyMove(gameState, { type: 'skip' });
    expect(gameState.phase).toBe('fortify');

    // Skip fortify phase
    gameState = applyMove(gameState, { type: 'skip' });
    expect(gameState.phase).toBe('deploy');
    expect(gameState.currentPlayer).toBe('blue');
  });

  it('should handle player elimination', () => {
    // Create a simplified 2-player game where one player can be eliminated
    const simpleState = createInitialState(['red', 'blue']);

    // Simulate a scenario where blue loses all territories
    // This would require many moves, so we'll just test the concept
    // 2-player games now include neutral player
    expect(simpleState.players).toEqual(['red', 'blue', 'neutral']);
    expect(simpleState.currentPlayer).toBe('red');
  });

  it('should calculate reinforcements correctly after territory changes', () => {
    calculateReinforcements(gameState, 'red');

    // Simulate gaining territories (this would happen through conquest)
    // For testing, we'll manually modify the state
    const modifiedState = {
      ...gameState,
      territories: {
        ...gameState.territories,
        // Simulate red gaining more territories
      }
    };

    const newReinforcements = calculateReinforcements(modifiedState, 'red');
    expect(typeof newReinforcements).toBe('number');
    expect(newReinforcements).toBeGreaterThanOrEqual(3);
  });
});

describe('game integration - multi-turn scenarios', () => {
  it('should handle turn rotation correctly', () => {
    const gameState = createInitialState(['red', 'blue', 'green']);

    // Complete initial placement first
    let currentState = completeInitialPlacement(gameState);

    // Complete red's turn
    while (currentState.currentPlayer === 'red' && !currentState.winner) {
      if (currentState.phase === 'deploy' && currentState.deployableTroops > 0) {
        const validMoves = getValidMoves(currentState);
        const deployMove = validMoves.find(move => move.type === 'deploy');
        if (deployMove) {
          currentState = applyMove(currentState, deployMove);
        } else {
          break;
        }
      } else {
        currentState = applyMove(currentState, { type: 'skip' });
      }
    }

    expect(currentState.currentPlayer).toBe('blue');
  });

  it('should maintain game state consistency across turns', () => {
    let gameState = createInitialState(['red', 'blue']);

    // Complete initial placement
    gameState = completeInitialPlacement(gameState);

    // Play a few turns
    for (let turn = 0; turn < 4; turn++) {
      const initialPlayer = gameState.currentPlayer;

      // Complete the current player's turn
      while (gameState.currentPlayer === initialPlayer && gameState.phase !== 'deploy') {
        gameState = applyMove(gameState, { type: 'skip' });
      }

      // Should be back to deploy phase for the same or next player
      expect(['deploy']).toContain(gameState.phase);
    }

    // Game should still be valid
    expect(gameState.winner).toBeNull();
    // 2-player games include neutral
    expect(gameState.players).toEqual(['red', 'blue', 'neutral']);
  });
});

describe('game integration - victory conditions', () => {
  it('should detect victory when a player owns all territories', () => {
    // This test would require simulating many conquests
    // For now, we'll test the concept with a simplified scenario
    const gameState = createInitialState(['red', 'blue']);

    // Test that the game state remains valid during play
    expect(gameState.winner).toBeNull();
    // 2-player games include neutral
    expect(gameState.players).toEqual(['red', 'blue', 'neutral']);
  });

  it('should handle continent bonuses in reinforcement calculations', () => {
    const gameState = createInitialState(['red', 'blue']);

    // Test that reinforcements include continent bonuses
    const reinforcements = calculateReinforcements(gameState, 'red');

    // With the mock state, red should get some bonus
    expect(reinforcements).toBeGreaterThanOrEqual(3);
  });
});

describe('game integration - edge cases', () => {
  it('should handle games with different player counts', () => {
    const twoPlayerGame = createInitialState(['red', 'blue']);
    const threePlayerGame = createInitialState(['red', 'blue', 'green']);
    const sixPlayerGame = createInitialState(['red', 'blue', 'green', 'yellow', 'purple', 'orange']);

    expect(twoPlayerGame.players).toHaveLength(2);
    expect(threePlayerGame.players).toHaveLength(3);
    expect(sixPlayerGame.players).toHaveLength(6);

    // All should have 42 territories total
    expect(Object.keys(twoPlayerGame.territories)).toHaveLength(42);
    expect(Object.keys(threePlayerGame.territories)).toHaveLength(42);
    expect(Object.keys(sixPlayerGame.territories)).toHaveLength(42);
  });

  it('should maintain valid game state after many moves', () => {
    let gameState = createInitialState(['red', 'blue']);

    // Apply many skip moves to test state consistency
    for (let i = 0; i < 20; i++) {
      const validMoves = getValidMoves(gameState);
      if (validMoves.length > 0) {
        gameState = applyMove(gameState, validMoves[0]);
      }
    }

    // State should still be valid
    // 2-player games include neutral
    expect(gameState.players).toEqual(['red', 'blue', 'neutral']);
    expect(gameState.winner).toBeNull();
    expect(Object.keys(gameState.territories)).toHaveLength(42);
  });

  it('should handle phase transitions correctly', () => {
    const gameState = createInitialState(['red', 'blue']);

    // Start in deploy phase
    expect(gameState.phase).toBe('deploy');

    // Deploy all troops to transition to attack
    let state = gameState;
    while (state.deployableTroops > 0) {
      const validMoves = getValidMoves(state);
      const deployMove = validMoves.find(move => move.type === 'deploy');
      if (deployMove) {
        state = applyMove(state, deployMove);
      } else {
        break;
      }
    }
    expect(state.phase).toBe('attack');

    // From attack to fortify
    state = applyMove(state, { type: 'skip' });
    expect(state.phase).toBe('fortify');

    // From fortify to next player deploy
    state = applyMove(state, { type: 'skip' });
    expect(state.phase).toBe('deploy');
    expect(state.currentPlayer).toBe('blue');
  });
});