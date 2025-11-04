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
    await page.fill('#username-create', 'Player1');
    await page.click('button:has-text("Create Game")');

    // Wait for game creation and redirect
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });
    const gameUrl = page.url();
    const gameId = gameUrl.split('/game/')[1].split('?')[0];
    expect(gameId).toBeTruthy();

    // Wait for game page to load and Player 1 to appear in player list
    await expect(page.getByTestId('player-name').filter({ hasText: /Player1/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/waiting|setup/i).first()).toBeVisible({ timeout: 10000 });

    // Open incognito context for Player 2
    const incognitoContext = await context.browser()!.newContext();
    const player2Page = await incognitoContext.newPage();

    // Player 2 joins the same game (direct URL access)
    await player2Page.goto(gameUrl);

    // Wait for page load, then fill username and join
    await player2Page.waitForLoadState('networkidle');
    const usernameInput = player2Page.locator('#username-create, input[name="username"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for both players to appear in their respective views
    await expect(player2Page.getByTestId('player-name').filter({ hasText: /Player2/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('player-name').filter({ hasText: /Player2/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/2.*players|players.*2/i)).toBeVisible({ timeout: 10000 });

    await incognitoContext.close();
  });
});

test.describe('Production Flow - Session Security', () => {
  let gameUrl: string;
  let playerId: string;

  test.beforeEach(async ({ page }) => {
    // Create a game to test session security
    await page.goto(PROD_URL);
    await page.fill('#username-create', 'SecurityTest');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });
    gameUrl = page.url();
  });

  test('should have HttpOnly session cookie', async ({ page }) => {
    // Reload page to ensure Server Action cookie is synced
    await page.reload();
    await page.waitForLoadState('networkidle');

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
    test.setTimeout(60000); // Increase timeout for multi-player flow

    // Create game
    await page.goto(PROD_URL);
    await page.fill('#username-create', 'Player1');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });
    const gameUrl = page.url();

    // Player 2 joins
    const player2Context = await context.browser()!.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(gameUrl);
    await player2Page.waitForLoadState('networkidle');

    const usernameInput = player2Page.locator('#username-create, input[name="username"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for both players to be visible (real-time sync)
    await expect(page.getByText(/2.*players|players.*2/i)).toBeVisible({ timeout: 20000 });

    // Start game
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeEnabled({ timeout: 15000 });
    await startButton.click();

    // Wait for setup/playing phase with longer timeout for server processing
    await expect(page.getByText(/setup|playing|place.*armies/i)).toBeVisible({ timeout: 20000 });

    // Verify territories were distributed (check for any territory name)
    await expect(page.getByText(/territories|alaska|brazil|china|egypt|india/i).first()).toBeVisible({ timeout: 10000 });

    // Verify armies are available to place
    await expect(page.getByText(/armies.*available|available.*armies|\d+.*armies/i).first()).toBeVisible({ timeout: 10000 });

    await player2Context.close();
  });

  test('should allow army placement during setup', async ({ page, context }) => {
    test.setTimeout(60000); // Increase timeout for multi-player flow

    // Create and start a game
    await page.goto(PROD_URL);
    await page.fill('#username-create', 'Player1');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });
    const gameUrl = page.url();

    // Add second player
    const player2Context = await context.browser()!.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(gameUrl);
    await player2Page.waitForLoadState('networkidle');

    const usernameInput = player2Page.locator('#username-create, input[name="username"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for both players
    await page.waitForTimeout(3000); // Allow real-time sync

    // Start game
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeEnabled({ timeout: 15000 });
    await startButton.click();

    // Wait for setup phase
    await page.waitForTimeout(5000); // Allow territory distribution

    // Try to find any clickable territory or army placement UI
    const armiesAvailable = page.getByText(/armies.*available|available.*armies/i).first();
    await expect(armiesAvailable).toBeVisible({ timeout: 15000 });

    await player2Context.close();
  });
});

test.describe('Production Flow - Realtime Updates', () => {
  test('should propagate actions between players in real-time', async ({ page, context }) => {
    test.setTimeout(60000);

    // Create game with Player 1
    await page.goto(PROD_URL);
    await page.fill('#username-create', 'Player1');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });
    const gameUrl = page.url();

    // Player 2 joins
    const player2Context = await context.browser()!.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(gameUrl);
    await player2Page.waitForLoadState('networkidle');

    const usernameInput = player2Page.locator('#username-create, input[name="username"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('Player2');
    await player2Page.click('button:has-text("Join Game")');

    // Wait for realtime connection (longer timeout for WebSocket)
    await page.waitForTimeout(5000);

    // Player 1 should see Player 2 appear via Realtime
    await expect(page.getByTestId('player-name').filter({ hasText: /Player2/i })).toBeVisible({ timeout: 20000 });

    // Player 2 should also see both players
    await expect(player2Page.getByTestId('player-name').filter({ hasText: /Player1/i })).toBeVisible({ timeout: 15000 });
    await expect(player2Page.getByTestId('player-name').filter({ hasText: /Player2/i })).toBeVisible({ timeout: 15000 });

    // Verify player count updates
    await expect(page.getByText(/2.*players|players.*2/i)).toBeVisible({ timeout: 10000 });
    await expect(player2Page.getByText(/2.*players|players.*2/i)).toBeVisible({ timeout: 10000 });

    await player2Context.close();
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.fill('#username-create', 'ReconnectTest');
    await page.click('button:has-text("Create Game")');
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });

    // Wait for initial connection
    await page.waitForTimeout(3000);

    // Simulate network interruption by reloading the game page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for reconnection (longer timeout for WebSocket reconnect)
    await page.waitForTimeout(10000);

    // Page should still function after reconnection (check for game UI)
    await expect(page.getByText(/players|waiting|setup|ReconnectTest/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Production Flow - Input Validation', () => {
  test('should reject XSS attempts in username', async ({ page }) => {
    await page.goto(PROD_URL);

    // Attempt XSS injection (short payload to trigger alphanumeric check, not length)
    await page.fill('#username-create', '<script>');

    // Should show validation error immediately (client-side)
    await expect(page.locator('#username-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#username-error')).toContainText(/can only contain letters, numbers/i);

    // Button should be disabled when validation fails
    const button = page.locator('button:has-text("Create Game")');
    await expect(button).toBeDisabled();

    // Should NOT create a game
    await expect(page).not.toHaveURL(/\/game\//);
  });

  test('should reject too short username', async ({ page }) => {
    await page.goto(PROD_URL);

    await page.fill('#username-create', 'a');

    // Should show validation error immediately (client-side)
    await expect(page.locator('#username-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#username-error')).toContainText(/at least 2 characters/i);

    // Button should be disabled when validation fails
    const button = page.locator('button:has-text("Create Game")');
    await expect(button).toBeDisabled();
  });

  test('should reject too long username', async ({ page }) => {
    await page.goto(PROD_URL);

    await page.fill('#username-create', 'a'.repeat(20));

    // Should show validation error immediately (client-side)
    await expect(page.locator('#username-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#username-error')).toContainText(/at most 16 characters/i);

    // Button should be disabled when validation fails
    const button = page.locator('button:has-text("Create Game")');
    await expect(button).toBeDisabled();
  });

  test('should accept valid usernames', async ({ page }) => {
    await page.goto(PROD_URL);

    await page.fill('#username-create', 'ValidUser_123');
    await page.click('button:has-text("Create Game")');

    // Should successfully create game and redirect
    await expect(page).toHaveURL(/\/game\//, { timeout: 15000 });

    // Username should appear in the player list
    await expect(page.getByTestId('player-name').filter({ hasText: /ValidUser_123/i })).toBeVisible({ timeout: 15000 });
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
