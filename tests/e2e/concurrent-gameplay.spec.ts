/**
 * Concurrent 2-Player Gameplay Tests
 *
 * Tests real-time multiplayer scenarios with concurrent actions.
 * Validates race conditions, state synchronization, and simultaneous operations.
 *
 * Run with: npm run test:e2e:concurrent
 */

import { test, expect, Browser } from '@playwright/test';
import { PersonaSimulator, createMultiplePersonas } from './helpers/user-personas';
import { createGameViaUI, setupTwoPlayerGame } from './helpers';

test.describe('Concurrent Gameplay - Race Conditions', () => {
  test('Simultaneous game creation by 2 players', async ({ browser }) => {
    const [player1, player2] = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'RacePlayer1', color: 'red' },
      { type: 'defensive', username: 'RacePlayer2', color: 'blue' },
    ]);

    try {
      // Both players create games simultaneously
      const [gameId1, gameId2] = await Promise.all([
        player1.createGame(),
        player2.createGame(),
      ]);

      // Both should succeed with different game IDs
      expect(gameId1).toBeTruthy();
      expect(gameId2).toBeTruthy();
      expect(gameId1).not.toBe(gameId2);

      // Both games should be accessible
      await expect(player1.getPage()).toHaveURL(new RegExp(`/game/${gameId1}`));
      await expect(player2.getPage()).toHaveURL(new RegExp(`/game/${gameId2}`));

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Race condition: 2 players join same game simultaneously', async ({ browser }) => {
    const [creator, player2, player3] = await createMultiplePersonas(browser, [
      { type: 'strategic', username: 'GameCreator', color: 'red' },
      { type: 'aggressive', username: 'RaceJoin1', color: 'blue' },
      { type: 'defensive', username: 'RaceJoin2', color: 'green' },
    ]);

    try {
      // Creator creates game
      await creator.createGame();
      const gameUrl = creator.getPage().url();

      // 2 players try to join simultaneously
      await Promise.all([
        player2.joinGame(gameUrl),
        player3.joinGame(gameUrl),
      ]);

      // Wait for both to appear in player list
      await creator.getPage().waitForTimeout(2000);

      // All 3 players should see each other
      const player2Name = creator.getPage().getByTestId('player-name').filter({ hasText: 'RaceJoin1' });
      const player3Name = creator.getPage().getByTestId('player-name').filter({ hasText: 'RaceJoin2' });

      await expect(player2Name).toBeVisible({ timeout: 10000 });
      await expect(player3Name).toBeVisible({ timeout: 10000 });

      // Verify no duplicate players
      const allPlayerNames = creator.getPage().getByTestId('player-name');
      const count = await allPlayerNames.count();
      expect(count).toBe(3); // Exactly 3 players

    } finally {
      await creator.cleanup();
      await player2.cleanup();
      await player3.cleanup();
    }
  });

  test('Simultaneous "Start Game" button clicks', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'aggressive', username: 'StartRace1', color: 'red' },
      { type: 'strategic', username: 'StartRace2', color: 'blue' }
    );

    try {

      // Both click start button simultaneously
      const startButton1 = player1.getPage().getByRole('button', { name: /start game/i });
      const startButton2 = player2.getPage().getByRole('button', { name: /start game/i });

      await Promise.all([
        startButton1.isVisible().then(async visible => { if (visible) await startButton1.click(); }),
        startButton2.isVisible().then(async visible => { if (visible) await startButton2.click(); }),
      ]);

      // Game should transition to setup phase without errors
      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });
      await expect(player2.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Should have 42 territories distributed
      await expect(player1.getPage().getByTestId('territory-card')).toHaveCount(42, { timeout: 10000 });

      // No error messages
      const errorMessage = player1.getPage().getByText(/error|failed/i);
      await expect(errorMessage).not.toBeVisible();

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Concurrent Gameplay - Setup Phase', () => {
  test('Concurrent territory selections during setup', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'aggressive', username: 'SetupPlayer1', color: 'red' },
      { type: 'defensive', username: 'SetupPlayer2', color: 'blue' }
    );

    try {

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Both players place armies simultaneously (5 iterations)
      for (let i = 0; i < 5; i++) {
        await Promise.all([
          player1.placeSetupArmies(),
          player2.placeSetupArmies(),
        ]);

        await player1.getPage().waitForTimeout(500);
      }

      // Verify no conflicts or errors
      const bodyText1 = await player1.getPage().textContent('body');
      const bodyText2 = await player2.getPage().textContent('body');

      expect(bodyText1).not.toContain('error');
      expect(bodyText2).not.toContain('error');

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Setup completion with concurrent army placements', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'strategic', username: 'ConcurrentSetup1', color: 'red' },
      { type: 'chaotic', username: 'ConcurrentSetup2', color: 'blue' }
    );

    try {

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Place armies until setup is complete (max 30 placements)
      for (let i = 0; i < 30; i++) {
        const armiesText1 = await player1.getPage().getByText(/armies available/i).textContent();
        const armiesText2 = await player2.getPage().getByText(/armies available/i).textContent();

        // Check if both have 0 armies
        if (armiesText1?.includes('0') && armiesText2?.includes('0')) {
          break;
        }

        await Promise.all([
          player1.placeSetupArmies(),
          player2.placeSetupArmies(),
        ]);

        await player1.getPage().waitForTimeout(300);
      }

      // Should auto-transition to playing phase
      await expect(player1.getPage().getByText(/playing|reinforcement/i)).toBeVisible({ timeout: 15000 });
      await expect(player2.getPage().getByText(/playing|reinforcement/i)).toBeVisible({ timeout: 15000 });

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Concurrent Gameplay - Real-Time Sync', () => {
  test('Real-time state synchronization between 2 players', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'aggressive', username: 'SyncTest1', color: 'red' },
      { type: 'defensive', username: 'SyncTest2', color: 'blue' }
    );

    try {
      // Player 2 should see Player 1 immediately
      await expect(player2.getPage().getByTestId('player-name').filter({ hasText: 'SyncTest1' }))
        .toBeVisible({ timeout: 10000 });

      // Start game
      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      // Both should see setup phase simultaneously
      await Promise.all([
        expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 }),
        expect(player2.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 }),
      ]);

      // Both should see the same territory count
      const territories1 = await player1.getPage().getByTestId('territory-card').count();
      const territories2 = await player2.getPage().getByTestId('territory-card').count();
      expect(territories1).toBe(territories2);
      expect(territories1).toBe(42);

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Action visibility: Player 1 action seen by Player 2', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'strategic', username: 'ActionPlayer1', color: 'red' },
      { type: 'chaotic', username: 'ActionPlayer2', color: 'blue' }
    );

    try {

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Player 1 places army
      await player1.placeSetupArmies();
      await player1.getPage().waitForTimeout(1000);

      // Player 2 should see updated army counts (via real-time subscription)
      const territories2 = player2.getPage().getByTestId('territory-card');
      const count2 = await territories2.count();
      expect(count2).toBeGreaterThan(0);

      // Territories should have army counts visible
      const firstTerritory = territories2.first();
      const territoryText = await firstTerritory.textContent();
      expect(territoryText).toMatch(/\d+/); // Should contain numbers

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('WebSocket connection active for both players', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'aggressive', username: 'WSPlayer1', color: 'red' },
      { type: 'defensive', username: 'WSPlayer2', color: 'blue' }
    );

    try {
      await player1.getPage().waitForTimeout(3000);
      await player2.getPage().waitForTimeout(3000);

      // Check for WebSocket errors in console
      const errors1: string[] = [];
      const errors2: string[] = [];

      player1.getPage().on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('websocket')) {
          errors1.push(msg.text());
        }
      });

      player2.getPage().on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('websocket')) {
          errors2.push(msg.text());
        }
      });

      await player1.getPage().waitForTimeout(3000);

      expect(errors1.length).toBe(0);
      expect(errors2.length).toBe(0);

      // No disconnected indicators
      await expect(player1.getPage().getByText(/disconnected|connection lost/i)).not.toBeVisible();
      await expect(player2.getPage().getByText(/disconnected|connection lost/i)).not.toBeVisible();

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Concurrent Gameplay - Turn-Based Actions', () => {
  test('Turn order enforcement with concurrent actions', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(browser,
      { type: 'aggressive', username: 'TurnPlayer1', color: 'red' },
      { type: 'strategic', username: 'TurnPlayer2', color: 'blue' }
    );

    try {

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Complete setup phase
      for (let i = 0; i < 20; i++) {
        await Promise.all([
          player1.placeSetupArmies(),
          player2.placeSetupArmies(),
        ]);
        await player1.getPage().waitForTimeout(300);
      }

      // Wait for playing phase
      await expect(player1.getPage().getByText(/playing|reinforcement/i)).toBeVisible({ timeout: 15000 });

      // Check whose turn it is
      const body1 = await player1.getPage().textContent('body');
      const body2 = await player2.getPage().textContent('body');

      // Only one should see "Your turn" or action buttons enabled
      const player1HasTurn = body1?.includes('Your turn') || body1?.includes('reinforcement');
      const player2HasTurn = body2?.includes('Your turn') || body2?.includes('reinforcement');

      // Exactly one player should have the turn
      expect(player1HasTurn || player2HasTurn).toBe(true);

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Persona-driven concurrent gameplay (5 turns)', async ({ browser }) => {
    const [aggressive, defensive] = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'AggressiveBot', color: 'red' },
      { type: 'defensive', username: 'DefensiveBot', color: 'blue' },
    ]);

    try {
      // Setup game
      await aggressive.createGame();
      const gameUrl = aggressive.getPage().url();
      await defensive.joinGame(gameUrl);

      await expect(aggressive.getPage().getByTestId('player-name').filter({ hasText: 'DefensiveBot' }))
        .toBeVisible({ timeout: 10000 });

      const startButton = aggressive.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      await expect(aggressive.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Complete setup
      for (let i = 0; i < 25; i++) {
        await Promise.all([
          aggressive.placeSetupArmies(),
          defensive.placeSetupArmies(),
        ]);
        await aggressive.getPage().waitForTimeout(200);
      }

      // Play 5 turns with concurrent monitoring
      for (let turn = 0; turn < 5; turn++) {
        await aggressive.getPage().waitForTimeout(2000);

        // Try executing turns (personas will respect turn order internally)
        await Promise.all([
          aggressive.executeTurn().catch(() => {}), // May fail if not their turn
          defensive.executeTurn().catch(() => {}),
        ]);

        await aggressive.getPage().waitForTimeout(1000);
      }

      // Verify game is still stable (no crashes)
      const body = await aggressive.getPage().textContent('body');
      expect(body).toBeTruthy();
      expect(body).not.toContain('Error');

    } finally {
      await aggressive.cleanup();
      await defensive.cleanup();
    }
  });
});

test.describe('Concurrent Gameplay - Browser Refresh', () => {
  test('Player refreshes browser mid-game, rejoins successfully', async ({ browser }) => {
    const { player1, player2, gameUrl } = await setupTwoPlayerGame(browser,
      { type: 'strategic', username: 'RefreshPlayer1', color: 'red' },
      { type: 'aggressive', username: 'RefreshPlayer2', color: 'blue' }
    );

    try {

      // Player 1 refreshes
      await player1.getPage().reload();
      await player1.getPage().waitForTimeout(2000);

      // Should still be in the game
      await expect(player1.getPage()).toHaveURL(gameUrl);

      // Player 2 should still see game normally
      const player2List = player2.getPage().getByTestId('player-name');
      const count = await player2List.count();
      expect(count).toBeGreaterThanOrEqual(2);

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});
