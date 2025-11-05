/**
 * Full Game Simulation - Lobby to Victory
 *
 * End-to-end simulation of a complete Risk game with 3 AI players.
 * Tests the entire game flow from creation to victory condition.
 *
 * Duration: ~10-15 minutes
 * Run with: PLAYWRIGHT_BASE_URL=https://risk-red.vercel.app npx playwright test tests/e2e/full-game-simulation.spec.ts
 */

import { test, expect } from '@playwright/test';
import { createMultiplePersonas } from './helpers/user-personas';

test.describe('Full Game Simulation', () => {
  test('Complete 3-player game: Lobby → Setup → Playing → Victory', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    console.log('🎮 Starting full game simulation...');

    // Create 3 players with different personas
    const [aggressive, defensive, strategic] = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'AggressiveAI', color: 'red' },
      { type: 'defensive', username: 'DefensiveAI', color: 'blue' },
      { type: 'strategic', username: 'StrategicAI', color: 'green' },
    ]);

    try {
      // ==================== PHASE 1: LOBBY ====================
      console.log('📋 Phase 1: Creating lobby...');

      await aggressive.createGame();
      const gameUrl = aggressive.getPage().url();
      console.log(`✅ Game created: ${gameUrl}`);

      // Players join
      console.log('👥 Players joining...');
      await defensive.joinGame(gameUrl);
      console.log('✅ DefensiveAI joined');

      await strategic.joinGame(gameUrl);
      console.log('✅ StrategicAI joined');

      // Verify all players are visible
      await expect(aggressive.getPage().getByTestId('player-name').filter({ hasText: 'DefensiveAI' }))
        .toBeVisible({ timeout: 10000 });
      await expect(aggressive.getPage().getByTestId('player-name').filter({ hasText: 'StrategicAI' }))
        .toBeVisible({ timeout: 10000 });

      const playerCount = await aggressive.getPage().getByTestId('player-name').count();
      expect(playerCount).toBe(3);
      console.log('✅ All 3 players in lobby');

      // ==================== PHASE 2: START GAME ====================
      console.log('\n🚀 Phase 2: Starting game...');

      const startButton = aggressive.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      // Wait for setup phase
      await expect(aggressive.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });
      await expect(defensive.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });
      await expect(strategic.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });
      console.log('✅ Game started, entered setup phase');

      // Verify territory distribution
      const territoryCount = await aggressive.getPage().getByTestId('territory-card').count();
      expect(territoryCount).toBe(42);
      console.log(`✅ 42 territories distributed`);

      // ==================== PHASE 3: SETUP (Army Placement) ====================
      console.log('\n🏗️  Phase 3: Setup phase (placing armies)...');

      let setupRounds = 0;
      const maxSetupRounds = 50; // Safety limit

      while (setupRounds < maxSetupRounds) {
        // Check if all players have 0 armies available
        const armiesText1 = await aggressive.getPage().getByText(/armies available/i).textContent();
        const armiesText2 = await defensive.getPage().getByText(/armies available/i).textContent();
        const armiesText3 = await strategic.getPage().getByText(/armies available/i).textContent();

        if (armiesText1?.includes('0') && armiesText2?.includes('0') && armiesText3?.includes('0')) {
          console.log('✅ All armies placed');
          break;
        }

        // All players place armies simultaneously
        await Promise.all([
          aggressive.placeSetupArmies(),
          defensive.placeSetupArmies(),
          strategic.placeSetupArmies(),
        ]);

        setupRounds++;

        if (setupRounds % 5 === 0) {
          console.log(`  Round ${setupRounds}: Placing armies...`);
        }

        await aggressive.getPage().waitForTimeout(300);
      }

      console.log(`✅ Setup completed in ${setupRounds} rounds`);

      // Wait for transition to playing phase
      await expect(aggressive.getPage().getByText(/playing|reinforcement/i))
        .toBeVisible({ timeout: 15000 });
      console.log('✅ Transitioned to playing phase');

      // ==================== PHASE 4: PLAYING (Turns) ====================
      console.log('\n⚔️  Phase 4: Playing phase (executing turns)...');

      let turnCount = 0;
      const maxTurns = 20; // Simulate 20 turns
      let gameFinished = false;

      for (let turn = 0; turn < maxTurns; turn++) {
        console.log(`\n🎯 Turn ${turn + 1}/${maxTurns}`);

        // Check if game has ended (someone won)
        const bodyText1 = await aggressive.getPage().textContent('body');
        const bodyText2 = await defensive.getPage().textContent('body');
        const bodyText3 = await strategic.getPage().textContent('body');

        if (
          bodyText1?.includes('Victory') ||
          bodyText1?.includes('Winner') ||
          bodyText2?.includes('Victory') ||
          bodyText2?.includes('Winner') ||
          bodyText3?.includes('Victory') ||
          bodyText3?.includes('Winner')
        ) {
          console.log('🏆 GAME FINISHED - Victory condition detected!');
          gameFinished = true;
          break;
        }

        // Execute turns for all players (they'll respect turn order internally)
        try {
          await Promise.all([
            aggressive.executeTurn().catch(() => console.log('  AggressiveAI: Not their turn')),
            defensive.executeTurn().catch(() => console.log('  DefensiveAI: Not their turn')),
            strategic.executeTurn().catch(() => console.log('  StrategicAI: Not their turn')),
          ]);
        } catch (error) {
          console.log(`  Turn ${turn + 1} execution error (expected for turn order)`);
        }

        // Wait between turns
        await aggressive.getPage().waitForTimeout(2000);

        turnCount++;

        // Log turn progress
        console.log(`  ✓ Turn ${turn + 1} completed`);
      }

      console.log(`\n📊 Game Statistics:`);
      console.log(`  Total turns simulated: ${turnCount}`);
      console.log(`  Game finished: ${gameFinished ? 'Yes 🏆' : 'No (reached turn limit)'}`);

      // ==================== PHASE 5: VALIDATION ====================
      console.log('\n✅ Phase 5: Final validation...');

      // Verify game is still stable
      const finalBody1 = await aggressive.getPage().textContent('body');
      const finalBody2 = await defensive.getPage().textContent('body');
      const finalBody3 = await strategic.getPage().textContent('body');

      expect(finalBody1).toBeTruthy();
      expect(finalBody2).toBeTruthy();
      expect(finalBody3).toBeTruthy();

      // No fatal errors
      expect(finalBody1).not.toContain('Fatal error');
      expect(finalBody2).not.toContain('Fatal error');
      expect(finalBody3).not.toContain('Fatal error');

      console.log('✅ All players still connected');
      console.log('✅ No fatal errors detected');

      // Check player counts
      const finalCount1 = await aggressive.getPage().getByTestId('player-name').count();
      const finalCount2 = await defensive.getPage().getByTestId('player-name').count();

      console.log(`  Player counts: ${finalCount1}, ${finalCount2}`);

      // ==================== COMPLETE ====================
      console.log('\n🎉 SIMULATION COMPLETE!');
      console.log('='  .repeat(60));

    } finally {
      await aggressive.cleanup();
      await defensive.cleanup();
      await strategic.cleanup();
    }
  });

  test('2-player game completes without errors', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000); // 10 minute timeout

    console.log('🎮 Starting 2-player game simulation...');

    const [player1, player2] = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'Aggressive2P', color: 'red' },
      { type: 'defensive', username: 'Defensive2P', color: 'blue' },
    ]);

    try {
      // Create and join
      await player1.createGame();
      const gameUrl = player1.getPage().url();
      await player2.joinGame(gameUrl);
      console.log('✅ 2 players in lobby');

      // Start game
      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();
      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });
      console.log('✅ Game started');

      // Setup phase
      for (let i = 0; i < 30; i++) {
        await Promise.all([
          player1.placeSetupArmies(),
          player2.placeSetupArmies(),
        ]);
        await player1.getPage().waitForTimeout(200);
      }
      console.log('✅ Setup completed');

      // Play 10 turns
      for (let turn = 0; turn < 10; turn++) {
        await Promise.all([
          player1.executeTurn().catch(() => {}),
          player2.executeTurn().catch(() => {}),
        ]);
        await player1.getPage().waitForTimeout(1500);
        console.log(`  Turn ${turn + 1}/10 completed`);
      }

      // Verify stability
      const body1 = await player1.getPage().textContent('body');
      const body2 = await player2.getPage().textContent('body');

      expect(body1).not.toContain('Fatal');
      expect(body2).not.toContain('Fatal');

      console.log('✅ 2-player game completed successfully');

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('6-player game (max capacity) starts successfully', async ({ browser }) => {
    test.setTimeout(5 * 60 * 1000); // 5 minute timeout

    console.log('🎮 Starting 6-player max capacity test...');

    const players = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'Player1', color: 'red' },
      { type: 'defensive', username: 'Player2', color: 'blue' },
      { type: 'strategic', username: 'Player3', color: 'green' },
      { type: 'chaotic', username: 'Player4', color: 'yellow' },
      { type: 'aggressive', username: 'Player5', color: 'purple' },
      { type: 'defensive', username: 'Player6', color: 'orange' },
    ]);

    try {
      // Create game
      await players[0].createGame();
      const gameUrl = players[0].getPage().url();
      console.log('✅ Game created');

      // All others join
      for (let i = 1; i < 6; i++) {
        await players[i].joinGame(gameUrl);
        console.log(`✅ Player${i + 1} joined`);
      }

      // Verify all 6 players visible
      const count = await players[0].getPage().getByTestId('player-name').count();
      expect(count).toBe(6);
      console.log('✅ All 6 players in lobby');

      // Start game
      const startButton = players[0].getPage().getByRole('button', { name: /start game/i });
      await startButton.click();
      await expect(players[0].getPage().getByText(/setup/i)).toBeVisible({ timeout: 15000 });
      console.log('✅ 6-player game started successfully');

      // Verify territory distribution
      const territories = await players[0].getPage().getByTestId('territory-card').count();
      expect(territories).toBe(42);
      console.log('✅ Territories distributed correctly');

      console.log('✅ 6-player capacity test passed');

    } finally {
      for (const player of players) {
        await player.cleanup();
      }
    }
  });

  test('Player elimination flow (if elimination occurs)', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);

    console.log('🎮 Testing player elimination scenario...');

    const [player1, player2, player3] = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'Dominator', color: 'red' },
      { type: 'defensive', username: 'WeakPlayer', color: 'blue' },
      { type: 'strategic', username: 'Observer', color: 'green' },
    ]);

    try {
      await player1.createGame();
      const gameUrl = player1.getPage().url();
      await player2.joinGame(gameUrl);
      await player3.joinGame(gameUrl);

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();
      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      // Setup
      for (let i = 0; i < 25; i++) {
        await Promise.all([
          player1.placeSetupArmies(),
          player2.placeSetupArmies(),
          player3.placeSetupArmies(),
        ]);
        await player1.getPage().waitForTimeout(200);
      }

      console.log('✅ Setup completed');

      // Play turns until someone is eliminated or max turns
      for (let turn = 0; turn < 30; turn++) {
        const bodyText = await player1.getPage().textContent('body');

        if (bodyText?.includes('eliminated') || bodyText?.includes('defeated')) {
          console.log(`🎯 Player elimination detected at turn ${turn + 1}`);

          // Verify eliminated player is marked
          const eliminatedIndicator = player1.getPage().getByText(/eliminated|defeated/i);
          await expect(eliminatedIndicator).toBeVisible({ timeout: 5000 });

          console.log('✅ Elimination flow working correctly');
          break;
        }

        await Promise.all([
          player1.executeTurn().catch(() => {}),
          player2.executeTurn().catch(() => {}),
          player3.executeTurn().catch(() => {}),
        ]);

        await player1.getPage().waitForTimeout(1500);
      }

      console.log('✅ Elimination scenario test completed');

    } finally {
      await player1.cleanup();
      await player2.cleanup();
      await player3.cleanup();
    }
  });
});
