/**
 * User Persona Simulator
 *
 * Simulates different player behaviors for realistic multi-user testing.
 * Each persona represents a distinct playing style and decision-making pattern.
 */

import { Page, BrowserContext } from '@playwright/test';

export type PersonaType = 'aggressive' | 'defensive' | 'strategic' | 'chaotic';

export interface PersonaConfig {
  name: string;
  type: PersonaType;
  username: string;
  color: string;
  thinkTime: { min: number; max: number }; // Milliseconds to wait before actions
  decisionBias: {
    attackProbability: number; // 0-1
    fortifyProbability: number; // 0-1
    preferContinentControl: boolean;
    targetWeakest: boolean; // true = attack weakest, false = attack strongest
  };
}

/**
 * Predefined personas with distinct playstyles
 */
export const PERSONAS: Record<PersonaType, Omit<PersonaConfig, 'username' | 'color'>> = {
  aggressive: {
    name: 'Aggressive Player',
    type: 'aggressive',
    thinkTime: { min: 200, max: 800 },
    decisionBias: {
      attackProbability: 0.95,
      fortifyProbability: 0.2,
      preferContinentControl: false,
      targetWeakest: true, // Attack weak territories to expand quickly
    },
  },
  defensive: {
    name: 'Defensive Player',
    type: 'defensive',
    thinkTime: { min: 800, max: 2000 },
    decisionBias: {
      attackProbability: 0.3,
      fortifyProbability: 0.9,
      preferContinentControl: true,
      targetWeakest: false, // Attack strong territories to eliminate threats
    },
  },
  strategic: {
    name: 'Strategic Player',
    type: 'strategic',
    thinkTime: { min: 500, max: 1500 },
    decisionBias: {
      attackProbability: 0.6,
      fortifyProbability: 0.6,
      preferContinentControl: true,
      targetWeakest: true, // Balanced approach
    },
  },
  chaotic: {
    name: 'Chaotic Player',
    type: 'chaotic',
    thinkTime: { min: 100, max: 500 },
    decisionBias: {
      attackProbability: 0.7,
      fortifyProbability: 0.5,
      preferContinentControl: false,
      targetWeakest: Math.random() > 0.5, // Random targeting
    },
  },
};

/**
 * Persona-driven player simulator
 */
export class PersonaSimulator {
  private page: Page;
  private context: BrowserContext;
  private config: PersonaConfig;
  private gameId: string | null = null;
  private isMyTurn = false;

  constructor(page: Page, context: BrowserContext, config: PersonaConfig) {
    this.page = page;
    this.context = context;
    this.config = config;
  }

  /**
   * Create a persona-based player
   */
  static async create(
    browser: any,
    personaType: PersonaType,
    username: string,
    color: string
  ): Promise<PersonaSimulator> {
    const context = await browser.newContext();
    const page = await context.newPage();

    const config: PersonaConfig = {
      ...PERSONAS[personaType],
      username,
      color,
    };

    return new PersonaSimulator(page, context, config);
  }

  /**
   * Simulate human thinking time
   */
  private async think(): Promise<void> {
    const { min, max } = this.config.thinkTime;
    const delay = Math.random() * (max - min) + min;
    await this.page.waitForTimeout(delay);
  }

  /**
   * Create a new game as this persona
   */
  async createGame(): Promise<string> {
    await this.page.goto('/');
    await this.think();

    const usernameInput = this.page.locator('input[placeholder*="username" i]').first();
    await usernameInput.fill(this.config.username);
    await this.think();

    const colorSelect = this.page.locator('select').first();
    await colorSelect.selectOption(this.config.color);
    await this.think();

    const createButton = this.page.getByRole('button', { name: /create game/i });
    await createButton.click();

    // Wait for navigation and extract game ID
    await this.page.waitForURL(/\/game\/[a-f0-9-]+/, { timeout: 10000 });
    const url = this.page.url();
    this.gameId = url.split('/game/')[1];

    return this.gameId;
  }

  /**
   * Join an existing game
   */
  async joinGame(gameUrl: string): Promise<void> {
    await this.page.goto(gameUrl);
    await this.think();

    const usernameInput = this.page.locator('input[placeholder*="username" i], #username-join').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill(this.config.username);
    await this.think();

    const colorSelect = this.page.locator('select').first();
    if (await colorSelect.isVisible({ timeout: 2000 })) {
      await colorSelect.selectOption(this.config.color);
      await this.think();
    }

    const joinButton = this.page.getByRole('button', { name: /join/i }).first();
    await joinButton.click();

    // Wait for join to complete
    await this.page.waitForTimeout(2000);
  }

  /**
   * Place armies during setup phase (persona-driven strategy)
   */
  async placeSetupArmies(): Promise<void> {
    await this.think();

    // Check if we have armies available
    const armiesText = await this.page.getByText(/armies available/i).textContent();
    const armiesMatch = armiesText?.match(/(\d+)/);

    if (!armiesMatch || parseInt(armiesMatch[1]) === 0) {
      return; // No armies to place
    }

    // Get territories owned by this player
    const myColor = this.config.color;
    const myTerritories = this.page.getByTestId('territory-card').filter({ hasText: new RegExp(myColor, 'i') });
    const count = await myTerritories.count();

    if (count === 0) {
      return; // No territories yet
    }

    // Choose territory based on persona
    let targetIndex: number;

    if (this.config.decisionBias.preferContinentControl) {
      // Defensive/Strategic: Reinforce border territories
      targetIndex = Math.floor(Math.random() * Math.min(3, count)); // Focus on first few territories
    } else {
      // Aggressive/Chaotic: Random placement
      targetIndex = Math.floor(Math.random() * count);
    }

    const territory = myTerritories.nth(targetIndex);
    await territory.click();
    await this.think();

    // Confirm placement if modal appears
    const confirmButton = this.page.getByRole('button', { name: /place|confirm/i });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
      await this.think();
    }
  }

  /**
   * Execute attack phase based on persona
   */
  async executeAttackPhase(): Promise<void> {
    await this.think();

    // Check if it's attack phase
    const phaseText = await this.page.textContent('body');
    if (!phaseText?.toLowerCase().includes('attack')) {
      return;
    }

    // Decide whether to attack based on persona
    const shouldAttack = Math.random() < this.config.decisionBias.attackProbability;

    if (!shouldAttack) {
      // Skip to fortify
      const skipButton = this.page.getByRole('button', { name: /skip|fortify/i }).first();
      if (await skipButton.isVisible({ timeout: 2000 })) {
        await skipButton.click();
        await this.think();
      }
      return;
    }

    // Find territories that can attack
    const myTerritories = this.page.getByTestId('territory-card').filter({
      hasText: new RegExp(this.config.color, 'i')
    });

    const count = await myTerritories.count();

    if (count > 0) {
      // Select a random territory to attack from
      const fromIndex = Math.floor(Math.random() * count);
      await myTerritories.nth(fromIndex).click();
      await this.think();

      // Try to confirm attack (if adjacent enemy territory available)
      const attackButton = this.page.getByRole('button', { name: /attack/i }).first();
      if (await attackButton.isVisible({ timeout: 2000 })) {
        await attackButton.click();
        await this.think();
      }
    }

    // Continue to fortify after 1-3 attacks
    const continueButton = this.page.getByRole('button', { name: /continue|fortify/i }).first();
    if (await continueButton.isVisible({ timeout: 2000 })) {
      await continueButton.click();
      await this.think();
    }
  }

  /**
   * Execute fortify phase based on persona
   */
  async executeFortifyPhase(): Promise<void> {
    await this.think();

    // Check if it's fortify phase
    const phaseText = await this.page.textContent('body');
    if (!phaseText?.toLowerCase().includes('fortify')) {
      return;
    }

    // Decide whether to fortify based on persona
    const shouldFortify = Math.random() < this.config.decisionBias.fortifyProbability;

    if (!shouldFortify) {
      // End turn without fortifying
      const endTurnButton = this.page.getByRole('button', { name: /end turn/i }).first();
      if (await endTurnButton.isVisible({ timeout: 2000 })) {
        await endTurnButton.click();
        await this.think();
      }
      return;
    }

    // Find territories to fortify between
    const myTerritories = this.page.getByTestId('territory-card').filter({
      hasText: new RegExp(this.config.color, 'i')
    });

    const count = await myTerritories.count();

    if (count >= 2) {
      // Select source territory
      const fromIndex = Math.floor(Math.random() * count);
      await myTerritories.nth(fromIndex).click();
      await this.think();

      // Select destination territory
      const toIndex = (fromIndex + 1) % count;
      await myTerritories.nth(toIndex).click();
      await this.think();

      // Confirm fortify
      const fortifyButton = this.page.getByRole('button', { name: /fortify|move/i }).first();
      if (await fortifyButton.isVisible({ timeout: 2000 })) {
        await fortifyButton.click();
        await this.think();
      }
    }

    // End turn
    const endTurnButton = this.page.getByRole('button', { name: /end turn/i }).first();
    if (await endTurnButton.isVisible({ timeout: 2000 })) {
      await endTurnButton.click();
      await this.think();
    }
  }

  /**
   * Execute a full turn based on persona
   */
  async executeTurn(): Promise<void> {
    await this.think();

    // Reinforcement phase - place armies
    const reinforceButton = this.page.getByRole('button', { name: /place|reinforce/i }).first();
    if (await reinforceButton.isVisible({ timeout: 2000 })) {
      // Place armies similar to setup
      await this.placeSetupArmies();
    }

    // Attack phase
    await this.executeAttackPhase();

    // Fortify phase
    await this.executeFortifyPhase();
  }

  /**
   * Wait until it's this persona's turn
   */
  async waitForTurn(): Promise<void> {
    // Poll for turn indicator
    const maxWait = 60000; // 60 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const bodyText = await this.page.textContent('body');

      if (bodyText?.includes('Your turn') || bodyText?.includes(this.config.username)) {
        this.isMyTurn = true;
        return;
      }

      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Get page instance for custom operations
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Get context for custom operations
   */
  getContext(): BrowserContext {
    return this.context;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.context.close();
  }
}

/**
 * Utility: Create multiple personas for concurrent testing
 */
export async function createMultiplePersonas(
  browser: any,
  personas: Array<{ type: PersonaType; username: string; color: string }>
): Promise<PersonaSimulator[]> {
  return Promise.all(
    personas.map(({ type, username, color }) =>
      PersonaSimulator.create(browser, type, username, color)
    )
  );
}
