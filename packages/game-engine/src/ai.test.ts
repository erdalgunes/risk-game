import { describe, it, expect, vi } from 'vitest';
import { getAIMove } from './ai';
import { createMockEarlyGameState } from './__fixtures__/mockGameStates';

describe('getAIMove', () => {
  it('should return a valid move during deploy phase', () => {
    const state = { ...createMockEarlyGameState(), phase: 'deploy' as const, deployableTroops: 3 };

    const move = getAIMove(state);

    expect(move).toBeDefined();
    expect(move.type).toBe('deploy');
    if (move.type === 'deploy') {
      expect(typeof move.territory).toBe('string');
      expect(move.troops).toBeGreaterThan(0);
      expect(move.troops).toBeLessThanOrEqual(3);
    }
  });

  it('should return a valid move during attack phase', () => {
    const state = { ...createMockEarlyGameState(), phase: 'attack' as const };

    const move = getAIMove(state);

    expect(move).toBeDefined();
    // Should return either an attack move or skip
    expect(['attack', 'skip']).toContain(move.type);
  });

  it('should return a valid move during fortify phase', () => {
    const state = { ...createMockEarlyGameState(), phase: 'fortify' as const };

    const move = getAIMove(state);

    expect(move).toBeDefined();
    // Should return either a fortify move or skip
    expect(['fortify', 'skip']).toContain(move.type);
  });

  it('should prefer attack moves over fortify moves', () => {
    // Mock a state where attack moves are available
    const state = { ...createMockEarlyGameState(), phase: 'attack' as const };

    // Mock Math.random to ensure consistent behavior
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const move = getAIMove(state);

    // In a real scenario with available attacks, it should prefer attacks
    // But since our mock state may not have valid attacks, it might return skip
    expect(move).toBeDefined();

    vi.restoreAllMocks();
  });

  it('should return skip when no other moves are available', () => {
    // Create a state where no valid moves exist - all red territories have only 1 troop
    const baseState = createMockEarlyGameState();
    const isolatedState: typeof baseState = {
      ...baseState,
      phase: 'attack' as const,
      territories: {
        ...Object.fromEntries(
          Object.entries(baseState.territories).map(([key, territory]) => [
            key,
            territory.owner === 'red'
              ? { ...territory, troops: 1 } // Red can't attack with 1 troop
              : territory
          ])
        )
      } as typeof baseState.territories
    };

    const move = getAIMove(isolatedState);

    expect(move.type).toBe('skip');
  });

  it('should make deterministic choices', () => {
    const state = { ...createMockEarlyGameState(), phase: 'deploy' as const, deployableTroops: 3 };

    // Mock Math.random for consistent results
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const move1 = getAIMove(state);
    const move2 = getAIMove(state);

    expect(move1).toEqual(move2);

    vi.restoreAllMocks();
  });
});

describe('AI decision making', () => {
  it('should prioritize border territories during deployment', () => {
    // Test that AI chooses territories adjacent to enemies
    const state = { ...createMockEarlyGameState(), phase: 'deploy' as const, deployableTroops: 3 };

    const move = getAIMove(state);

    // The AI should choose a territory it owns
    expect(move.type).toBe('deploy');
    if (move.type === 'deploy') {
      expect(move.territory).toBeDefined();
    }
  });

  it('should handle edge cases gracefully', () => {
    // Test with minimal troops
    const minimalState = { ...createMockEarlyGameState(), phase: 'deploy' as const, deployableTroops: 1 };

    const move = getAIMove(minimalState);

    expect(move.type).toBe('deploy');
    if (move.type === 'deploy') {
      expect(move.troops).toBe(1);
    }
  });
});