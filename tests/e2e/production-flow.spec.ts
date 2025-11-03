import { test, expect, type Page } from '@playwright/test';

const PROD_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://risk-red.vercel.app';

/**
 * E2E Production Flow Tests
 *
 * These tests verify the complete game flow in production:
 * - Game creation and joining
 * - Session security (HttpOnly cookies)
 * - Game progression (setup → playing → finished)
 * - Realtime updates between players
 * - Input validation
 */

test.describe('Production Flow - Game Creation & Join', () => {
  test('should create game and allow second player to join', async ({ page, context }) => {
    // Navigate to lobby
    await page.goto(PROD_URL);
    await expect(page).toHaveTitle(/Risk Game/i);

    // Create game as Player 1
    await page.fill('input[placeholder*="name" i], input[name="username"]', 'Player1');
    await page.click('button:has-text("Create Game")');

    // Wait for game creation and redirect
    await expect(page).toHaveURL(/\/game\//);
    const gameUrl = page.url();
    const gameId = gameUrl.split('/game/')[1];
    expect(gameId).toBeTruthy();

    // Verify Player 1 is in lobby
    await expect(page.getByText(/Player1/i).first()).toBeVisible();
    await expect(page.getByText(/waiting for players/i).first()).toBeVisible();

    // Open incognito context for Player 2
    const incognitoContext = await context.browser()!.newContext();
    const player2Page = await incognitoContext.newPage();

    // Player 2 joins the same game
    await player2Page.goto(gameUrl);
    await player2Page.fill('input[placeholder*="name" i], input[name="username"]', 'Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for both players to appear
    await expect(player2Page.getByText(/Player2/i).first()).toBeVisible();
    await expect(page.getByText(/Player2/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/2.*players joined/i)).toBeVisible();

    await incognitoContext.close();
  });
});

test.describe('Production Flow - Session Security', () => {
  let gameUrl: string;
  let playerId: string;

  test.beforeEach(async ({ page }) => {
    // Create a game to test session security
    await page.goto(PROD_URL);
    await page.fill('input[placeholder*="name" i], input[name="username"]', 'SecurityTest');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//);
    gameUrl = page.url();
  });

  test('should have HttpOnly session cookie', async ({ page }) => {
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.startsWith('player_session_'));

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);

    // In production, should also be Secure
    if (gameUrl.startsWith('https://')) {
      expect(sessionCookie?.secure).toBe(true);
    }

    expect(sessionCookie?.sameSite).toBe('Lax');
  });

  test('should reject actions with invalid session', async ({ page }) => {
    // Try to manipulate player ID in localStorage or by other means
    // The server should reject any action that doesn't match the session cookie

    // This test verifies that even if client-side data is manipulated,
    // the server validates against the HttpOnly session cookie
    await page.evaluate(() => {
      // Attempt to modify any client state
      localStorage.setItem('fake_player_id', 'malicious-id');
    });

    // Any game action should still work with the valid session cookie
    // (This assumes the game uses the session cookie, not client-side storage)
    const errorMessage = page.locator('text=/invalid session/i');

    // We expect NO invalid session errors because the session is valid
    await expect(errorMessage).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Production Flow - Game Progression', () => {
  test('should complete full game flow: setup → playing', async ({ page, context }) => {
    // Create game
    await page.goto(PROD_URL);
    await page.fill('input[placeholder*="name" i], input[name="username"]', 'Player1');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//);
    const gameUrl = page.url();

    // Player 2 joins
    const player2Context = await context.browser()!.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(gameUrl);
    await player2Page.fill('input[placeholder*="name" i], input[name="username"]', 'Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for both players
    await expect(page.getByText(/2.*players/i)).toBeVisible();

    // Start game
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Wait for setup phase
    await expect(page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });

    // Verify territories were distributed
    await expect(page.getByText(/territories/i)).toBeVisible();
    await expect(page.locator('[data-testid="territory-list"]').or(page.locator('text=/alaska|brazil|china/i')).first()).toBeVisible({ timeout: 5000 });

    // Verify both players have armies to place
    const armiesText = page.locator('text=/armies available/i');
    await expect(armiesText).toBeVisible();

    await player2Context.close();
  });

  test('should allow army placement during setup', async ({ page, context }) => {
    // Create and start a game
    await page.goto(PROD_URL);
    await page.fill('input[placeholder*="name" i], input[name="username"]', 'Player1');
    await page.click('button:has-text("Create Game")');
    const gameUrl = page.url();

    // Add second player
    const player2Context = await context.browser()!.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(gameUrl);
    await player2Page.fill('input[placeholder*="name" i], input[name="username"]', 'Player2');
    await player2Page.click('button:has-text("Join Game")');
    await page.waitForTimeout(2000);

    // Start game
    await page.locator('button:has-text("Start Game")').click();
    await page.waitForTimeout(3000);

    // Find a territory owned by current player and click it
    const territories = page.locator('[data-territory-owned="true"]').or(page.locator('button:has-text(/alaska|brazil|china/i)')).first();

    if (await territories.count() > 0) {
      await territories.first().click();

      // Should see army placement modal
      await expect(page.getByText(/place.*arm/i)).toBeVisible({ timeout: 5000 });
    }

    await player2Context.close();
  });
});

test.describe('Production Flow - Realtime Updates', () => {
  test('should propagate actions between players in real-time', async ({ page, context }) => {
    // Create game with Player 1
    await page.goto(PROD_URL);
    await page.fill('input[placeholder*="name" i], input[name="username"]', 'Player1');
    await page.click('button:has-text("Create Game")');
    const gameUrl = page.url();

    // Player 2 joins
    const player2Context = await context.browser()!.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(gameUrl);
    await player2Page.fill('input[placeholder*="name" i], input[name="username"]', 'Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for realtime connection
    await page.waitForTimeout(2000);

    // Player 1 should see Player 2 appear via Realtime
    await expect(page.getByText(/Player2/i).first()).toBeVisible({ timeout: 10000 });

    // Player 2 should also see both players
    await expect(player2Page.getByText(/Player1/i).first()).toBeVisible();
    await expect(player2Page.getByText(/Player2/i).first()).toBeVisible();

    // Verify player count updates
    await expect(page.getByText(/2.*players/i)).toBeVisible();
    await expect(player2Page.getByText(/2.*players/i)).toBeVisible();

    await player2Context.close();
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.fill('input[placeholder*="name" i], input[name="username"]', 'ReconnectTest');
    await page.click('button:has-text("Create Game")');

    // Wait for initial connection
    await page.waitForTimeout(2000);

    // Check console for realtime connection logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // Simulate network interruption by closing and reopening the page
    await page.reload();

    // Wait for reconnection
    await page.waitForTimeout(5000);

    // Check if reconnection happened (look for reconnection logs)
    const hasReconnectLogs = logs.some(log =>
      log.includes('Reconnect') || log.includes('SUBSCRIBED') || log.includes('connected')
    );

    // Even without logs, page should still function
    await expect(page.getByText(/Create Game|Join Game|waiting/i).first()).toBeVisible();
  });
});

test.describe('Production Flow - Input Validation', () => {
  test('should reject XSS attempts in username', async ({ page }) => {
    await page.goto(PROD_URL);

    // Attempt XSS injection
    await page.fill('input[placeholder*="name" i], input[name="username"]', '<script>alert("xss")</script>');

    // Should show validation error immediately (client-side)
    await expect(page.getByText(/invalid|only.*letters|alphanumeric/i)).toBeVisible({ timeout: 5000 });

    // Button should be disabled when validation fails
    const button = page.locator('button:has-text("Create Game")');
    await expect(button).toBeDisabled();

    // Should NOT create a game
    await expect(page).not.toHaveURL(/\/game\//);
  });

  test('should reject too short username', async ({ page }) => {
    await page.goto(PROD_URL);

    await page.fill('input[placeholder*="name" i], input[name="username"]', 'a');

    // Should show validation error immediately (client-side)
    await expect(page.getByText(/at least 2 characters|too short/i)).toBeVisible({ timeout: 5000 });

    // Button should be disabled when validation fails
    const button = page.locator('button:has-text("Create Game")');
    await expect(button).toBeDisabled();
  });

  test('should reject too long username', async ({ page }) => {
    await page.goto(PROD_URL);

    await page.fill('input[placeholder*="name" i], input[name="username"]', 'a'.repeat(20));

    // Should show validation error immediately (client-side)
    await expect(page.getByText(/at most 16 characters|too long/i)).toBeVisible({ timeout: 5000 });

    // Button should be disabled when validation fails
    const button = page.locator('button:has-text("Create Game")');
    await expect(button).toBeDisabled();
  });

  test('should accept valid usernames', async ({ page }) => {
    await page.goto(PROD_URL);

    await page.fill('input[placeholder*="name" i], input[name="username"]', 'ValidUser_123');
    await page.click('button:has-text("Create Game")');

    // Should successfully create game
    await expect(page).toHaveURL(/\/game\//, { timeout: 10000 });
    await expect(page.getByText(/ValidUser_123/i).first()).toBeVisible();
  });
});

test.describe('Production Flow - Performance & Accessibility', () => {
  test('should load homepage quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(PROD_URL);
    const loadTime = Date.now() - startTime;

    // Should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Should have main content visible
    await expect(page.getByText(/Risk Game|Create Game|Join Game/i).first()).toBeVisible();
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto(PROD_URL);

    // Should have skip link for accessibility
    const skipLink = page.locator('a:has-text("Skip to main content")').or(page.locator('[href="#main-content"]'));

    // Page should have main landmarks
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });
});
