import type { Game, Player, Territory } from './game';

/**
 * AI difficulty levels
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * AI strategy interface
 */
export interface AIStrategy {
  /**
   * Execute reinforcement phase decisions
   */
  executeReinforcementPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void>;

  /**
   * Execute attack phase decisions
   */
  executeAttackPhase(
    game: Game,
    player: Player,
    allPlayers: Player[],
    territories: Territory[]
  ): Promise<void>;

  /**
   * Execute fortify phase decisions
   */
  executeFortifyPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void>;
}

/**
 * AI decision context
 */
export interface AIDecisionContext {
  game: Game;
  player: Player;
  allPlayers: Player[];
  territories: Territory[];
  myTerritories: Territory[];
  enemyTerritories: Territory[];
}

/**
 * Territory with additional AI analysis data
 */
export interface AnalyzedTerritory extends Territory {
  adjacentEnemies: Territory[];
  adjacentAllies: Territory[];
  isBorder: boolean;
  isInterior: boolean;
  strategicValue: number;
}

/**
 * Attack opportunity for AI evaluation
 */
export interface AttackOpportunity {
  from: Territory;
  to: Territory;
  odds: number;
  priority: number;
}

/**
 * Fortify opportunity for AI evaluation
 */
export interface FortifyOpportunity {
  from: Territory;
  to: Territory;
  armyCount: number;
  priority: number;
}
