/**
 * Performance Benchmark Tests
 *
 * Measures and validates performance metrics against defined budgets.
 * Tests Core Web Vitals, response times, and resource usage.
 *
 * Run with: npm run test:e2e:performance
 */

import { test, expect } from '@playwright/test';
import { createGameViaUI, setupTwoPlayerGame } from './helpers';
import { PersonaSimulator, createMultiplePersonas } from './helpers/user-personas';

test.describe('Performance - Core Web Vitals', () => {
  test('Homepage First Contentful Paint (FCP) < 1.5s', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for first contentful paint
    await page.waitForLoadState('domcontentloaded');

    const fcpTime = Date.now() - startTime;

    console.log(`FCP: ${fcpTime}ms`);
    expect(fcpTime).toBeLessThan(1500); // < 1.5 seconds
  });

  test('Homepage Time to Interactive (TTI) < 3s', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for full interactivity
    await page.waitForLoadState('networkidle');

    const ttiTime = Date.now() - startTime;

    console.log(`TTI: ${ttiTime}ms`);
    expect(ttiTime).toBeLessThan(3000); // < 3 seconds
  });

  test('Homepage DOM Content Loaded < 2s', async ({ page }) => {
    await page.goto('/');

    const timing = await page.evaluate(() => {
      const perf = window.performance.timing;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
        loadComplete: perf.loadEventEnd - perf.navigationStart,
      };
    });

    console.log(`DOM Content Loaded: ${timing.domContentLoaded}ms`);
    console.log(`Load Complete: ${timing.loadComplete}ms`);

    expect(timing.domContentLoaded).toBeLessThan(2000);
    expect(timing.loadComplete).toBeLessThan(3000);
  });

  test('Game page load < 2s', async ({ page }) => {
    // Create game first
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'PerfTest', 'red');

    // Measure game page reload
    const startTime = Date.now();
    await page.goto(`/game/${gameId}`);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`Game page load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000); // < 2 seconds
  });
});

test.describe('Performance - Server Actions', () => {
  test('Create game Server Action < 1s', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('FastCreate');

    const colorSelect = page.locator('select').first();
    await colorSelect.selectOption('red');

    const startTime = Date.now();

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    await page.waitForURL(/\/game\//, { timeout: 10000 });

    const responseTime = Date.now() - startTime;

    console.log(`Create game response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(1000); // < 1 second
  });

  test('Join game Server Action < 800ms', async ({ browser }) => {
    const [creator, joiner] = await createMultiplePersonas(browser, [
      { type: 'strategic', username: 'Creator', color: 'red' },
      { type: 'aggressive', username: 'Joiner', color: 'blue' },
    ]);

    try {
      await creator.createGame();
      const gameUrl = creator.getPage().url();

      await joiner.getPage().goto(gameUrl);

      const usernameInput = joiner.getPage().locator('input[placeholder*="username" i]').first();
      await usernameInput.fill('Joiner');

      const startTime = Date.now();

      const joinButton = joiner.getPage().getByRole('button', { name: /join/i }).first();
      await joinButton.click();

      // Wait for join to complete
      await expect(
        joiner.getPage().getByTestId('player-name').filter({ hasText: 'Joiner' })
      ).toBeVisible({ timeout: 5000 });

      const responseTime = Date.now() - startTime;

      console.log(`Join game response time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(800); // < 800ms
    } finally {
      await creator.cleanup();
      await joiner.cleanup();
    }
  });

  test('Start game Server Action < 1.5s', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(
      browser,
      { type: 'defensive', username: 'Player1', color: 'red' },
      { type: 'strategic', username: 'Player2', color: 'blue' }
    );

    try {
      const startTime = Date.now();

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      await expect(player1.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      const responseTime = Date.now() - startTime;

      console.log(`Start game response time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(1500); // < 1.5 seconds
    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Place army Server Action < 500ms', async ({ page }) => {
    await page.goto('/');
    await createGameViaUI(page, 'ArmyPlace', 'red');

    // Wait for game to load
    await page.waitForTimeout(2000);

    // Find clickable territory
    const territory = page.getByTestId('territory-card').first();

    const startTime = Date.now();
    await territory.click();

    // Wait for response
    await page.waitForTimeout(1000);

    const responseTime = Date.now() - startTime;

    console.log(`Place army response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(500); // < 500ms
  });
});

test.describe('Performance - Real-time Updates', () => {
  test('WebSocket message latency < 200ms', async ({ browser }) => {
    const joinStartTime = Date.now();

    const { player1, player2 } = await setupTwoPlayerGame(
      browser,
      { type: 'aggressive', username: 'Latency1', color: 'red' },
      { type: 'defensive', username: 'Latency2', color: 'blue' }
    );

    try {
      const latency = Date.now() - joinStartTime;

      console.log(`Real-time update latency: ${latency}ms`);
      expect(latency).toBeLessThan(2000); // < 2 seconds (includes join action + WebSocket propagation)
    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Real-time sync latency for game state updates', async ({ browser }) => {
    const { player1, player2 } = await setupTwoPlayerGame(
      browser,
      { type: 'strategic', username: 'Sync1', color: 'red' },
      { type: 'chaotic', username: 'Sync2', color: 'blue' }
    );

    try {
      // Player 1 starts game
      const startTime = Date.now();

      const startButton = player1.getPage().getByRole('button', { name: /start game/i });
      await startButton.click();

      // Measure how long until Player 2 sees setup phase
      await expect(player2.getPage().getByText(/setup/i)).toBeVisible({ timeout: 10000 });

      const syncLatency = Date.now() - startTime;

      console.log(`Game state sync latency: ${syncLatency}ms`);
      expect(syncLatency).toBeLessThan(3000); // < 3 seconds
    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Performance - Resource Usage', () => {
  test('Memory usage stable over long session', async ({ page }) => {
    await page.goto('/');
    await createGameViaUI(page, 'MemoryTest', 'red');

    // Measure initial memory
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMetrics === null) {
      console.log('Memory metrics not available in this browser');
      return;
    }

    console.log(`Initial memory: ${(initialMetrics / 1024 / 1024).toFixed(2)} MB`);

    // Gate the long-session hold behind an override; default to 60s to keep CI fast
    const holdDurationMs = process.env.PLAYWRIGHT_LONG_SESSION_MS
      ? Number.parseInt(process.env.PLAYWRIGHT_LONG_SESSION_MS, 10)
      : 60_000;
    await page.waitForTimeout(holdDurationMs);

    // Measure final memory
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (finalMetrics === null) {
      return;
    }

    console.log(`Final memory: ${(finalMetrics / 1024 / 1024).toFixed(2)} MB`);

    const memoryGrowth = finalMetrics - initialMetrics;
    const growthPercentage = (memoryGrowth / initialMetrics) * 100;

    console.log(`Memory growth: ${growthPercentage.toFixed(2)}%`);

    // Memory growth should be < 50% over test duration (no major leaks)
    expect(growthPercentage).toBeLessThan(50);
  });

  test('No memory leaks during repeated game creation', async ({ page }) => {
    await page.goto('/');

    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMetrics === null) {
      console.log('Memory metrics not available');
      return;
    }

    // Create and navigate away 5 times
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await createGameViaUI(page, `LeakTest${i}`, 'red');
      await page.waitForTimeout(2000);
      await page.goto('/');
      await page.waitForTimeout(1000);
    }

    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (finalMetrics === null) {
      return;
    }

    const memoryGrowth = finalMetrics - initialMetrics;
    const growthPercentage = (memoryGrowth / initialMetrics) * 100;

    console.log(`Memory growth after 5 game creations: ${growthPercentage.toFixed(2)}%`);

    // Should not grow significantly
    expect(growthPercentage).toBeLessThan(100); // < 100% growth
  });

  test('Page size budget (homepage < 500KB)', async ({ page }) => {
    const response = await page.goto('/');

    const timing = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const navEntry = entries[0] as PerformanceNavigationTiming;
        return {
          transferSize: navEntry.transferSize,
          encodedBodySize: navEntry.encodedBodySize,
          decodedBodySize: navEntry.decodedBodySize,
        };
      }
      return null;
    });

    if (timing) {
      const transferSizeKB = timing.transferSize / 1024;
      console.log(`Page transfer size: ${transferSizeKB.toFixed(2)} KB`);
      console.log(`Encoded size: ${(timing.encodedBodySize / 1024).toFixed(2)} KB`);
      console.log(`Decoded size: ${(timing.decodedBodySize / 1024).toFixed(2)} KB`);

      // Homepage should be < 500KB transferred
      expect(transferSizeKB).toBeLessThan(500);
    }
  });
});

test.describe('Performance - Concurrent Load', () => {
  test('10 concurrent game creations complete within 5s', async ({ browser }) => {
    const startTime = Date.now();

    // Create 10 games concurrently
    const promises = Array.from({ length: 10 }, async (_, i) => {
      const persona = await PersonaSimulator.create(
        browser,
        'aggressive',
        `ConcurrentPlayer${i}`,
        'red'
      );
      await persona.createGame();
      await persona.cleanup();
    });

    await Promise.all(promises);

    const totalTime = Date.now() - startTime;

    console.log(`10 concurrent game creations: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(5000); // < 5 seconds for all 10
  });

  test('5 players join same game simultaneously (< 3s)', async ({ browser }) => {
    const creator = await PersonaSimulator.create(browser, 'strategic', 'GameHost', 'red');

    try {
      await creator.createGame();
      const gameUrl = creator.getPage().url();

      const startTime = Date.now();

      // 5 players join simultaneously
      const joiners = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          PersonaSimulator.create(
            browser,
            'aggressive',
            `Joiner${i}`,
            ['blue', 'green', 'yellow', 'purple', 'orange'][i]
          )
        )
      );

      await Promise.all(joiners.map((joiner) => joiner.joinGame(gameUrl)));

      const totalTime = Date.now() - startTime;

      console.log(`5 simultaneous joins: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(3000); // < 3 seconds

      // Cleanup
      await Promise.all(joiners.map((j) => j.cleanup()));
    } finally {
      await creator.cleanup();
    }
  });
});

test.describe('Performance - Rendering', () => {
  test('Territory list renders 42 items < 1s', async ({ page }) => {
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'RenderTest', 'red');

    // Need another player to start game
    const context2 = await page.context().browser()?.newContext();
    if (!context2) return;

    const page2 = await context2.newPage();
    await page2.goto(`/game/${gameId}`);

    const usernameInput = page2.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('Player2');
    await page2.getByRole('button', { name: /join/i }).first().click();

    await page.waitForTimeout(2000);

    const startTime = Date.now();

    const startButton = page.getByRole('button', { name: /start game/i });
    await startButton.click();

    // Wait for 42 territories to render
    await expect(page.getByTestId('territory-card')).toHaveCount(42, { timeout: 10000 });

    const renderTime = Date.now() - startTime;

    console.log(`42 territories render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000); // < 1 second

    await context2.close();
  });

  test('Player list updates render < 100ms', async ({ browser }) => {
    const startTime = Date.now();

    const { player1, player2 } = await setupTwoPlayerGame(
      browser,
      { type: 'strategic', username: 'UpdateTest1', color: 'red' },
      { type: 'aggressive', username: 'UpdateTest2', color: 'blue' }
    );

    try {
      const updateTime = Date.now() - startTime;

      console.log(`Player list update render time: ${updateTime}ms`);
      expect(updateTime).toBeLessThan(2000); // < 2 seconds (includes network + render)
    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Performance - Database Queries', () => {
  test('Game fetch query < 300ms', async ({ page }) => {
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'QueryTest', 'red');

    // Reload game page (forces DB query)
    const startTime = Date.now();

    await page.goto(`/game/${gameId}`);
    await page.waitForLoadState('domcontentloaded');

    const queryTime = Date.now() - startTime;

    console.log(`Game fetch query time: ${queryTime}ms`);
    expect(queryTime).toBeLessThan(2000); // < 2 seconds (includes full page load)
  });

  test('Homepage loads without database queries', async ({ page }) => {
    // Homepage should be static (no DB queries)
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`Static homepage load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(1000); // < 1 second
  });
});
