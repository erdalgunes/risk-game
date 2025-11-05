/**
 * E2E Test Helpers
 *
 * Reusable functions for Playwright E2E tests
 */

import { Page, expect, Browser } from '@playwright/test';
import { PersonaSimulator, PersonaType, createMultiplePersonas } from './helpers/user-personas';

/**
 * Check if local Supabase is running OR if running in CI
 * In CI, we allow tests to run with placeholder credentials to verify UI flows
 */
export async function hasLocalDatabase(): Promise<boolean> {
  // Allow tests to run in CI environment
  if (process.env.CI === 'true') {
    return true;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url?.includes('localhost') || url?.includes('127.0.0.1') || false;
}

/**
 * Create a game via UI and return game ID
 */
export async function createGameViaUI(
  page: Page,
  username: string,
  color: string = 'red',
  maxPlayers: number = 4
): Promise<string | null> {
  await page.goto('/');

  // Fill username
  const usernameInput = page.locator('input[placeholder*="username" i]').first();
  await usernameInput.fill(username);

  // Select color
  const colorSelect = page.locator('select').first();
  await colorSelect.selectOption(color);

  // Select max players if available
  const maxPlayersSelect = page.locator('select').nth(1);
  if (await maxPlayersSelect.isVisible({ timeout: 1000 })) {
    await maxPlayersSelect.selectOption(maxPlayers.toString());
  }

  // Click create
  const createButton = page.locator('button:has-text("Create Game")').first();
  await createButton.click();

  try {
    // Wait for navigation
    await page.waitForURL(/\/game\/[a-f0-9-]+/, { timeout: 10000 });

    // Extract game ID from URL
    const gameId = page.url().match(/\/game\/([a-f0-9-]+)/)?.[1];
    return gameId || null;
  } catch (error) {
    return null;
  }
}

/**
 * Join a game via UI
 */
export async function joinGameViaUI(
  page: Page,
  gameId: string,
  username: string,
  color: string = 'blue'
): Promise<boolean> {
  await page.goto('/');

  // Option 1: Try to join from games list
  const joinButton = page.locator(`button:has-text("Join")`).first();

  if (await joinButton.isVisible({ timeout: 2000 })) {
    // Fill username and color for join form
    const usernameInput = page.locator('input[placeholder*="username" i]').nth(1);
    await usernameInput.fill(username);

    const colorSelect = page.locator('select').nth(1);
    await colorSelect.selectOption(color);

    await joinButton.click();

    try {
      await page.waitForURL(/\/game\//, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  // Option 2: Navigate directly to game page
  await page.goto(`/game/${gameId}`);
  await page.waitForTimeout(1000);

  return page.url().includes(gameId);
}

/**
 * Wait for game to be in specific status
 */
export async function waitForGameStatus(
  page: Page,
  status: 'waiting' | 'setup' | 'playing' | 'finished',
  timeout: number = 5000
): Promise<boolean> {
  const statusRegex = new RegExp(status, 'i');

  try {
    await expect(page.locator(`text=${statusRegex}`)).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for player count to be visible
 */
export async function waitForPlayerCount(
  page: Page,
  count: number,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await expect(page.locator(`text=/Players.*${count}/i`)).toBeVisible({ timeout });
    return true;
  } catch {
    // Alternative: look for individual player elements
    const players = page.locator('[data-testid="player"]');
    await expect(players).toHaveCount(count, { timeout });
    return true;
  }
}

/**
 * Click on a territory (if visible)
 */
export async function clickTerritory(
  page: Page,
  territoryName: string
): Promise<boolean> {
  const territory = page.locator(`[data-testid="territory-${territoryName}"]`);

  if (await territory.isVisible({ timeout: 2000 })) {
    await territory.click();
    return true;
  }

  // Fallback: try text match
  const territoryByText = page.locator(`text=${territoryName}`);
  if (await territoryByText.isVisible({ timeout: 1000 })) {
    await territoryByText.click();
    return true;
  }

  return false;
}

/**
 * Get player's army count
 */
export async function getArmyCount(page: Page): Promise<number | null> {
  try {
    const armyText = await page.locator('[data-testid="army-count"]').textContent();
    if (armyText) {
      const match = armyText.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Check if it's player's turn
 */
export async function isMyTurn(page: Page): Promise<boolean> {
  const yourTurn = page.locator('text=/your turn|you.*turn/i');
  return yourTurn.isVisible({ timeout: 1000 });
}

/**
 * End turn via UI
 */
export async function endTurn(page: Page): Promise<boolean> {
  const endTurnButton = page.locator('button:has-text("End Turn")');

  if (await endTurnButton.isVisible({ timeout: 2000 })) {
    await endTurnButton.click();
    await page.waitForTimeout(500);
    return true;
  }

  return false;
}

/**
 * Take a screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout: number = 1000
): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all visible game IDs from lobby
 */
export async function getAvailableGameIds(page: Page): Promise<string[]> {
  await page.goto('/');
  await page.waitForTimeout(1000);

  const gameElements = page.locator('[data-testid="game-item"]');
  const count = await gameElements.count();

  const gameIds: string[]= [];

  for (let i = 0; i < count; i++) {
    const gameId = await gameElements.nth(i).getAttribute('data-game-id');
    if (gameId) {
      gameIds.push(gameId);
    }
  }

  return gameIds;
}

/**
 * Setup a two-player game with personas and wait for both players to be visible
 *
 * @returns Object with player1, player2 and gameUrl
 */
export async function setupTwoPlayerGame(
  browser: Browser,
  player1Config: { type: PersonaType; username: string; color: string },
  player2Config: { type: PersonaType; username: string; color: string }
): Promise<{ player1: PersonaSimulator; player2: PersonaSimulator; gameUrl: string }> {
  const [player1, player2] = await createMultiplePersonas(browser, [
    player1Config,
    player2Config,
  ]);

  await player1.createGame();
  const gameUrl = player1.getPage().url();
  await player2.joinGame(gameUrl);

  // Wait for both players to see each other
  await expect(player1.getPage().getByTestId('player-name').filter({ hasText: player2Config.username }))
    .toBeVisible({ timeout: 10000 });

  return { player1, player2, gameUrl };
}

/**
 * Start game and wait for setup phase to begin
 *
 * @param page Page object (usually player1.getPage())
 */
export async function startGameAndWaitForSetup(page: Page): Promise<void> {
  const startButton = page.getByRole('button', { name: /start game/i });
  await startButton.click();
  await expect(page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });
}
