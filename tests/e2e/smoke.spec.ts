/**
 * Smoke Test Suite - Fast Critical Path Tests
 *
 * Run on every PR to catch critical bugs quickly.
 * These tests MUST be fast (3-5 minutes total) and cover only essential functionality.
 *
 * Target Duration: 3-5 minutes
 * Run with: npm run test:e2e:smoke
 * Tags: @smoke
 */

import { test, expect } from '@playwright/test';
import { createGameViaUI, setupTwoPlayerGameSimple, assertSecurityHeaders } from './helpers';

test.describe('Smoke Tests @smoke', () => {
  test.describe.configure({ mode: 'serial' }); // Serial for faster execution

  test('1. Homepage loads @smoke', async ({ page }) => {
    await page.goto('/');

    // Critical elements present
    await expect(page).toHaveTitle(/Risk/i);
    await expect(page.getByRole('heading', { name: /risk/i })).toBeVisible();
    await expect(page.locator('input[placeholder*="username" i]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /create game/i })).toBeVisible();
  });

  test('2. Can create game @smoke', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill('SmokePlayer');

    const colorSelect = page.locator('select').first();
    await colorSelect.selectOption('red');

    const createButton = page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Navigate to game page
    await expect(page).toHaveURL(/\/game\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(page.getByTestId('player-name')).toContainText('SmokePlayer');
  });

  test('3. Second player can join @smoke', async ({ page, browser }) => {
    const { player2Context } = await setupTwoPlayerGameSimple(page, browser);
    await player2Context.close();
  });

  test('4. Can start game with 2 players @smoke', async ({ page, browser }) => {
    const { player2Page, player2Context } = await setupTwoPlayerGameSimple(page, browser);

    // Start game
    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    // Transition to setup phase
    await expect(page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('territory-card')).toHaveCount(42, { timeout: 10000 });
    await expect(player2Page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });

    await player2Context.close();
  });

  test('5. Can place armies during setup @smoke', async ({ page, browser }) => {
    const { player2Context } = await setupTwoPlayerGameSimple(page, browser);

    await page.getByRole('button', { name: /start game/i }).click();
    await expect(page.getByText(/setup/i)).toBeVisible({ timeout: 10000 });

    // Place army on owned territory
    const myTerritory = page.getByTestId('territory-card').filter({ hasText: /red/i }).first();
    await expect(myTerritory).toBeVisible({ timeout: 10000 });

    const armiesAvailable = page.getByText(/armies available/i);
    const initialArmies = await armiesAvailable.textContent();

    await myTerritory.click();

    // Confirm if modal appears
    const confirmButton = page.getByRole('button', { name: /place|confirm/i });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Verify armies changed
    await page.waitForTimeout(1000);
    const newArmies = await armiesAvailable.textContent();
    expect(newArmies).not.toBe(initialArmies);

    await player2Context.close();
  });

  test('6. No JavaScript errors on load @smoke', async ({ page }) => {
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

  test('7. Security headers present @smoke', async ({ page }) => {
    await assertSecurityHeaders(page);
  });
});
