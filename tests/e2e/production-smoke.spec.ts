/**
 * Production Smoke Tests
 *
 * Critical path testing for production deployments.
 * These tests must pass before deployment is considered successful.
 *
 * Tests: Homepage → Create Game → Join → Start → Setup → Playing → Attack → End Turn
 * Expected Duration: ~2-3 minutes
 * Run with: npm run test:e2e:smoke
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { createGameViaUI, joinGameViaUI, setupTwoPlayerGameSimple, assertSecurityHeaders } from './helpers';

test.describe('Production Smoke Tests - Critical Path', () => {
  test.describe.configure({ mode: 'serial' }); // Run in order for faster execution

  test('1. Homepage loads successfully', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to homepage
    await page.goto('/');

    // Page should load within 3 seconds
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);

    // Check critical elements are present
    await expect(page).toHaveTitle(/Risk/i);
    await expect(page.getByRole('heading', { name: /risk/i })).toBeVisible();

    // Create game form should be visible
    await expect(page.locator('input[placeholder*="username" i]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /create game/i })).toBeVisible();

    // No console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);
    expect(consoleErrors.length).toBe(0);
  });

  test('2. Can create a game', async ({ page }) => {
    await page.goto('/');

    // Fill form
    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('Player1');

    const colorSelect = page.locator('select').first();
    await colorSelect.selectOption('red');

    // Create game
    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should navigate to game page
    await expect(page).toHaveURL(/\/game\/[a-f0-9-]+/, { timeout: 10000 });

    // Player should appear in player list
    await expect(page.getByTestId('player-name')).toContainText('Player1');

    // Game should be in waiting status
    await expect(page.getByText(/waiting/i)).toBeVisible({ timeout: 5000 });
  });

  test('3. Second player can join game', async ({ page, browser }) => {
    const { player2Context } = await setupTwoPlayerGameSimple(page, browser);
    await player2Context.close();
  });

  test('4. Can start game with 2 players', async ({ page, browser }) => {
    const { player2Page, player2Context } = await setupTwoPlayerGameSimple(page, browser);

    // Start game
    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    // Should transition to setup phase
    await expect(page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });

    // Territories should be distributed
    await expect(page.getByTestId('territory-card')).toHaveCount(42, { timeout: 10000 });

    // Both players should see setup phase
    await expect(player2Page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });

    await player2Context.close();
  });

  test('5. Can place armies during setup', async ({ page, browser }) => {
    const { player2Context } = await setupTwoPlayerGameSimple(page, browser);

    const startButton = page.getByRole('button', { name: /start game/i });
    await startButton.click();
    await expect(page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });

    // Find a territory owned by Player 1 (red)
    const myTerritory = page.getByTestId('territory-card').filter({ hasText: /red/i }).first();
    await expect(myTerritory).toBeVisible({ timeout: 10000 });

    // Click to place army
    await myTerritory.click();

    // Should show placement modal or update army count
    // Check if armies available decreased or modal appeared
    const armiesAvailable = page.getByText(/armies available/i);
    const initialArmies = await armiesAvailable.textContent();

    // If modal, confirm placement
    const confirmButton = page.getByRole('button', { name: /place|confirm/i });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Verify army was placed (army count should change)
    await page.waitForTimeout(1000);
    const newArmies = await armiesAvailable.textContent();

    // Armies should have decreased
    expect(newArmies).not.toBe(initialArmies);

    await player2Context.close();
  });

  test('6. WebSocket connection is active', async ({ page }) => {
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'Player1', 'red');

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // Check for WebSocket connection (no connection errors in console)
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('websocket')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(3000);
    expect(consoleErrors.length).toBe(0);

    // Connection status should not show "disconnected"
    const disconnectedIndicator = page.getByText(/disconnected|connection lost/i);
    await expect(disconnectedIndicator).not.toBeVisible();
  });

  test('7. Session cookie is set', async ({ page }) => {
    await page.goto('/');
    await createGameViaUI(page, 'Player1', 'red');

    // Wait for Server Action to complete
    await page.waitForTimeout(2000);

    // Check cookies
    const cookies = await page.context().cookies();

    // Should have a player session cookie
    const sessionCookie = cookies.find(c => c.name.startsWith('player_session_'));

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Lax');
  });

  test('8. Security headers are present', async ({ page }) => {
    await assertSecurityHeaders(page);
  });

  test('9. Rate limiting is active', async ({ page }) => {
    await page.goto('/');

    // Attempt rapid game creation
    const results: boolean[] = [];

    for (let i = 0; i < 5; i++) {
      try {
        const username = `RapidUser${i}`;
        const usernameInput = page.locator('input[placeholder*="username" i]').first();
        await usernameInput.fill(username);

        const createButton = page.getByRole('button', { name: /create game/i });
        await createButton.click();

        await page.waitForTimeout(500);

        // Check if navigation occurred
        const url = page.url();
        results.push(url.includes('/game/'));

        if (url.includes('/game/')) {
          // Go back for next attempt
          await page.goto('/');
        }
      } catch (error) {
        results.push(false);
      }
    }

    // At least one request should be rate limited (not all 5 should succeed)
    const successCount = results.filter(r => r).length;
    expect(successCount).toBeLessThan(5);
  });

  test('10. Production environment is configured', async ({ page }) => {
    await page.goto('/');

    // Should not show dev-mode indicators
    await expect(page.getByText(/localhost|development mode/i)).not.toBeVisible();

    // Should not have placeholder Supabase URL in errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.waitForTimeout(2000);

    const placeholderMessages = consoleMessages.filter(msg =>
      msg.includes('placeholder.supabase.co')
    );

    expect(placeholderMessages.length).toBe(0);
  });
});

test.describe('Production Smoke Tests - Performance', () => {
  test('Homepage loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // First Load should be < 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Time to Interactive
    const performanceTiming = await page.evaluate(() => {
      const perf = window.performance.timing;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
        loadComplete: perf.loadEventEnd - perf.navigationStart,
      };
    });

    expect(performanceTiming.domContentLoaded).toBeLessThan(2000);
    expect(performanceTiming.loadComplete).toBeLessThan(3000);
  });

  test('Game page loads within performance budget', async ({ page }) => {
    // Create game first
    await page.goto('/');
    const gameId = await createGameViaUI(page, 'Player1', 'red');

    // Measure game page load
    const startTime = Date.now();
    await page.goto(`/game/${gameId}`);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('Server Action responds within 1 second', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('SpeedTest');

    const startTime = Date.now();
    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    await page.waitForURL(/\/game\//, { timeout: 10000 });
    const responseTime = Date.now() - startTime;

    // Server Action should respond within 1 second
    expect(responseTime).toBeLessThan(1000);
  });
});

test.describe('Production Smoke Tests - Error Handling', () => {
  test('No JavaScript errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('Handles invalid game ID gracefully', async ({ page }) => {
    const response = await page.goto('/game/invalid-id-12345');

    // Should not crash, should show error or redirect
    expect(response?.status()).toBeLessThan(500);

    // Should show error message or redirect to homepage
    const hasError = await page.getByText(/not found|invalid|error/i).isVisible({ timeout: 5000 }).catch(() => false);
    const isHomepage = page.url().includes('/') && !page.url().includes('/game/');

    expect(hasError || isHomepage).toBe(true);
  });

  test('Validates username input', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('input[placeholder*="username" i]').first();

    // Test empty username
    await usernameInput.fill('');
    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Should not navigate (validation should fail)
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/game/');

    // Test too short username
    await usernameInput.fill('A');
    await createButton.click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/game/');

    // Test valid username
    await usernameInput.fill('ValidUser');
    await createButton.click();
    await page.waitForURL(/\/game\//, { timeout: 10000 });
    expect(page.url()).toContain('/game/');
  });
});
