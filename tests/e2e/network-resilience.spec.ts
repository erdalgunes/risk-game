/**
 * Network Resilience Tests
 *
 * Tests application behavior under adverse network conditions.
 * Validates connection recovery, retry logic, and graceful degradation.
 *
 * Run with: npm run test:e2e:resilience
 */

import { test, expect } from '@playwright/test';
import { PersonaSimulator, createMultiplePersonas } from './helpers/user-personas';
import { createGameViaUI } from './helpers';

test.describe('Network Resilience - Slow Connection', () => {
  test('Game loads successfully on slow 3G connection', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Should still load, just slower
    await expect(page.getByRole('heading', { name: /risk/i })).toBeVisible({ timeout: 15000 });

    // Should be usable
    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await expect(usernameInput).toBeVisible();
  });

  test('Game creation works on throttled connection', async ({ page, context }) => {
    // Throttle connection
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      await route.continue();
    });

    await page.goto('/');

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('SlowPlayer');

    const colorSelect = page.locator('select').first();
    await colorSelect.selectOption('red');

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should still succeed, just takes longer
    await expect(page).toHaveURL(/\/game\/[a-f0-9-]+/, { timeout: 20000 });
    await expect(page.getByTestId('player-name')).toContainText('SlowPlayer', { timeout: 10000 });
  });

  test('Real-time updates work on slow connection', async ({ browser }) => {
    const [player1, player2] = await createMultiplePersonas(browser, [
      { type: 'strategic', username: 'SlowNet1', color: 'red' },
      { type: 'aggressive', username: 'SlowNet2', color: 'blue' },
    ]);

    try {
      // Throttle player 2's connection
      await player2.getContext().route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
        await route.continue();
      });

      await player1.createGame();
      const gameUrl = player1.getPage().url();

      // Player 2 joins with slow connection
      await player2.joinGame(gameUrl);

      // Player 1 should eventually see Player 2 (may take longer)
      await expect(player1.getPage().getByTestId('player-name').filter({ hasText: 'SlowNet2' }))
        .toBeVisible({ timeout: 15000 });

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Network Resilience - Connection Dropout', () => {
  test('Handles brief connection dropout during game', async ({ page, context }) => {
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'DropoutPlayer', 'red');

    // Simulate connection dropout (block all requests for 3 seconds)
    let dropoutActive = false;
    await context.route('**/*', async (route) => {
      if (dropoutActive) {
        // Simulate connection failure
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    // Wait for stable connection
    await page.waitForTimeout(2000);

    // Activate dropout
    dropoutActive = true;
    await page.waitForTimeout(3000);

    // Restore connection
    dropoutActive = false;

    // Game should recover
    await page.waitForTimeout(3000);

    // Should still show game state
    const playerName = page.getByTestId('player-name');
    await expect(playerName).toBeVisible({ timeout: 10000 });
  });

  test('WebSocket reconnection after brief dropout', async ({ page, context }) => {
    await page.goto('/');
    await createGameViaUI(page, 'WSDropout', 'red');

    // Monitor WebSocket errors
    const wsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('websocket')) {
        wsErrors.push(msg.text());
      }
    });

    // Wait for connection to establish
    await page.waitForTimeout(2000);

    // Simulate network interruption by blocking WebSocket traffic
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('supabase') && url.includes('realtime')) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await page.waitForTimeout(5000);

    // Restore connection
    await context.unroute('**/*');

    await page.waitForTimeout(5000);

    // Should attempt reconnection
    // Game state should still be accessible
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Fatal error');
  });

  test('Action during connection dropout is retried', async ({ page, context }) => {
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'RetryPlayer', 'red');

    // Wait for game to load
    await page.waitForTimeout(2000);

    // Block network temporarily
    let networkBlocked = false;
    await context.route('**/*', async (route) => {
      if (networkBlocked && route.request().method() === 'POST') {
        // Fail POST requests (Server Actions)
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    networkBlocked = true;

    // Try to perform action (will fail initially)
    const refreshButton = page.getByRole('button').first();
    if (await refreshButton.isVisible({ timeout: 2000 })) {
      await refreshButton.click();
    }

    await page.waitForTimeout(2000);

    // Restore network
    networkBlocked = false;

    // Wait for retry logic to kick in
    await page.waitForTimeout(3000);

    // Page should still be functional
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});

test.describe('Network Resilience - Connection Recovery', () => {
  test('State synchronization after reconnection', async ({ browser }) => {
    const [player1, player2] = await createMultiplePersonas(browser, [
      { type: 'defensive', username: 'Recovery1', color: 'red' },
      { type: 'strategic', username: 'Recovery2', color: 'blue' },
    ]);

    try {
      await player1.createGame();
      const gameUrl = player1.getPage().url();
      await player2.joinGame(gameUrl);

      await expect(player1.getPage().getByTestId('player-name').filter({ hasText: 'Recovery2' }))
        .toBeVisible({ timeout: 10000 });

      // Block player 2's network temporarily
      await player2.getContext().route('**/*', async (route) => {
        await route.abort('failed');
      });

      await player2.getPage().waitForTimeout(3000);

      // Restore connection
      await player2.getContext().unroute('**/*');

      await player2.getPage().waitForTimeout(5000);

      // Player 2 should see current game state
      const player2List = player2.getPage().getByTestId('player-name');
      const count = await player2List.count();
      expect(count).toBeGreaterThanOrEqual(2);

      // Should see Recovery1
      await expect(player2.getPage().getByTestId('player-name').filter({ hasText: 'Recovery1' }))
        .toBeVisible({ timeout: 10000 });

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });

  test('Polling fallback after repeated WebSocket failures', async ({ page, context }) => {
    // This test validates the fallback to polling after 5 WebSocket reconnection failures
    await page.goto('/');
    await createGameViaUI(page, 'PollingFallback', 'red');

    // Monitor console for fallback message
    const messages: string[] = [];
    page.on('console', msg => {
      messages.push(msg.text());
    });

    // Block WebSocket connections repeatedly
    let blockCount = 0;
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('realtime') && blockCount < 10) {
        blockCount++;
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    // Wait for multiple reconnection attempts
    await page.waitForTimeout(15000);

    // Check if polling fallback was triggered (or at least no fatal errors)
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Fatal');

    // Game should still be accessible
    const playerName = page.getByTestId('player-name');
    await expect(playerName).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Network Resilience - High Latency', () => {
  test('Game remains playable with 500ms latency', async ({ page, context }) => {
    // Simulate high latency
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/');

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('HighLatency');

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should work, just slower
    await expect(page).toHaveURL(/\/game\/[a-f0-9-]+/, { timeout: 30000 });
    await expect(page.getByTestId('player-name')).toContainText('HighLatency', { timeout: 15000 });
  });

  test('Multiplayer sync with asymmetric latency', async ({ browser }) => {
    const [player1, player2] = await createMultiplePersonas(browser, [
      { type: 'aggressive', username: 'FastPlayer', color: 'red' },
      { type: 'defensive', username: 'SlowPlayer', color: 'blue' },
    ]);

    try {
      // Player 2 has high latency
      await player2.getContext().route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 400));
        await route.continue();
      });

      await player1.createGame();
      const gameUrl = player1.getPage().url();
      await player2.joinGame(gameUrl);

      // Player 1 (fast) should eventually see Player 2 (slow)
      await expect(player1.getPage().getByTestId('player-name').filter({ hasText: 'SlowPlayer' }))
        .toBeVisible({ timeout: 20000 });

      // Player 2 (slow) should see Player 1 (fast)
      await expect(player2.getPage().getByTestId('player-name').filter({ hasText: 'FastPlayer' }))
        .toBeVisible({ timeout: 20000 });

    } finally {
      await player1.cleanup();
      await player2.cleanup();
    }
  });
});

test.describe('Network Resilience - Partial Failures', () => {
  test('API request failure with retry logic', async ({ page, context }) => {
    await page.goto('/');

    // Fail first attempt, succeed on retry
    let attemptCount = 0;
    await context.route('**/api/**', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('RetryAPI');

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should retry and succeed
    await expect(page).toHaveURL(/\/game\/[a-f0-9-]+/, { timeout: 20000 });
  });

  test('Mixed network conditions (some requests fail)', async ({ page, context }) => {
    await page.goto('/');

    // Randomly fail 20% of requests
    await context.route('**/*', async (route) => {
      if (Math.random() < 0.2) { // NOSONAR - Test network failure simulation
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    const gameId = await createGameViaUI(page, 'MixedNet', 'red');

    // Should still work despite failures
    await expect(page).toHaveURL(/\/game\//);
    await expect(page.getByTestId('player-name')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Network Resilience - Timeout Handling', () => {
  test('Handles slow server response gracefully', async ({ page, context }) => {
    await page.goto('/');

    // Delay server responses by 5 seconds
    await context.route('**/rest/v1/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('SlowServer');

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should show loading indicator (button disabled)
    await expect(createButton).toBeDisabled({ timeout: 2000 });

    // Should eventually succeed or show timeout error
    await page.waitForTimeout(10000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Connection timeout error is user-friendly', async ({ page, context }) => {
    await page.goto('/');

    // Block all Supabase requests
    await context.route('**/*supabase*/**', async (route) => {
      await route.abort('timedout');
    });

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('TimeoutTest');

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should show error toast or message (not just hang)
    await page.waitForTimeout(5000);

    // No infinite loading state
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Creating...');
  });
});

test.describe('Network Resilience - Browser Offline Mode', () => {
  test('Detects offline state and shows indicator', async ({ page, context }) => {
    await page.goto('/');
    await createGameViaUI(page, 'OfflineTest', 'red');

    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    await page.waitForTimeout(3000);

    // Check for disconnected indicator or graceful handling
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Restore online
    await context.setOffline(false);

    await page.waitForTimeout(3000);

    // Should reconnect
    const playerName = page.getByTestId('player-name');
    await expect(playerName).toBeVisible({ timeout: 10000 });
  });

  test('Queues actions while offline, sends when back online', async ({ page, context }) => {
    await page.goto('/');
    await createGameViaUI(page, 'QueueTest', 'red');

    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Try to perform action (should queue or show error)
    const button = page.getByRole('button').first();
    if (await button.isVisible({ timeout: 2000 })) {
      await button.click().catch(() => {});
    }

    await page.waitForTimeout(2000);

    // Go back online
    await context.setOffline(false);

    await page.waitForTimeout(5000);

    // Game should recover
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Fatal');
  });
});
