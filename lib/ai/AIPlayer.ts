import type { Game, Player, Territory } from '@/types/game';
import type { AIStrategy, AIDifficulty } from '@/types/ai';
import { RandomStrategy } from './RandomStrategy';

/**
 * AI Player Controller
 * Manages AI decision-making and turn execution
 */
export class AIPlayer {
  private strategy: AIStrategy;
  private playerId: string;
  private gameId: string;

  constructor(
    playerId: string,
    gameId: string,
    difficulty: AIDifficulty = 'easy'
  ) {
    this.playerId = playerId;
    this.gameId = gameId;
    this.strategy = this.createStrategy(difficulty);
  }

  /**
   * Create strategy based on difficulty level
   */
  private createStrategy(difficulty: AIDifficulty): AIStrategy {
    // TODO: Implement medium and hard difficulty strategies
    // For now, all difficulties use RandomStrategy
    return new RandomStrategy();
  }

  /**
   * Log AI action with player name prefix
   */
  private log(player: Player, message: string): void {
    console.log(`[AI ${player.username}] ${message}`);
  }

  /**
   * Log AI error with player name prefix
   */
  private logError(player: Player, message: string, error?: unknown): void {
    console.error(`[AI ${player.username}] ${message}`, error || '');
  }

  /**
   * Execute current phase based on game state
   */
  async executeTurn(
    game: Game,
    player: Player,
    allPlayers: Player[],
    territories: Territory[]
  ): Promise<void> {
    if (game.status !== 'playing' && game.status !== 'setup') {
      this.log(player, 'Game not in playable state');
      return;
    }

    // Verify it's this AI's turn
    if (player.turn_order !== game.current_player_order) {
      this.log(player, "Not this player's turn");
      return;
    }

    // Execute phase-specific logic
    try {
      if (game.status === 'setup') {
        this.log(player, 'Executing setup phase');
        await this.strategy.executeReinforcementPhase(game, player, territories);
      } else if (game.phase === 'reinforcement') {
        this.log(player, 'Executing reinforcement phase');
        await this.strategy.executeReinforcementPhase(game, player, territories);
      } else if (game.phase === 'attack') {
        this.log(player, 'Executing attack phase');
        await this.strategy.executeAttackPhase(game, player, allPlayers, territories);
      } else if (game.phase === 'fortify') {
        this.log(player, 'Executing fortify phase');
        await this.strategy.executeFortifyPhase(game, player, territories);
      }
    } catch (error) {
      this.logError(player, 'Error executing turn:', error);
    }
  }

  /**
   * Change strategy dynamically
   */
  public setStrategy(strategy: AIStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current player ID
   */
  public getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Get current game ID
   */
  public getGameId(): string {
    return this.gameId;
  }
}
