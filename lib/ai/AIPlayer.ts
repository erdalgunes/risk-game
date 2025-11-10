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
   * Execute current phase based on game state
   */
  async executeTurn(
    game: Game,
    player: Player,
    allPlayers: Player[],
    territories: Territory[]
  ): Promise<void> {
    if (game.status !== 'playing' && game.status !== 'setup') {
      console.log(`[AI ${player.username}] Game not in playable state`);
      return;
    }

    // Verify it's this AI's turn
    if (player.turn_order !== game.current_player_order) {
      console.log(`[AI ${player.username}] Not this player's turn`);
      return;
    }

    // Execute phase-specific logic
    try {
      if (game.status === 'setup') {
        await this.executeSetupPhase(game, player, territories);
      } else if (game.phase === 'reinforcement') {
        await this.executeReinforcementPhase(game, player, territories);
      } else if (game.phase === 'attack') {
        await this.executeAttackPhase(game, player, allPlayers, territories);
      } else if (game.phase === 'fortify') {
        await this.executeFortifyPhase(game, player, territories);
      }
    } catch (error) {
      console.error(`[AI ${player.username}] Error executing turn:`, error);
    }
  }

  /**
   * Execute setup phase (initial army placement)
   */
  private async executeSetupPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void> {
    console.log(`[AI ${player.username}] Executing setup phase`);
    await this.strategy.executeReinforcementPhase(game, player, territories);
  }

  /**
   * Execute reinforcement phase
   */
  private async executeReinforcementPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void> {
    console.log(`[AI ${player.username}] Executing reinforcement phase`);
    await this.strategy.executeReinforcementPhase(game, player, territories);
  }

  /**
   * Execute attack phase
   */
  private async executeAttackPhase(
    game: Game,
    player: Player,
    allPlayers: Player[],
    territories: Territory[]
  ): Promise<void> {
    console.log(`[AI ${player.username}] Executing attack phase`);
    await this.strategy.executeAttackPhase(game, player, allPlayers, territories);
  }

  /**
   * Execute fortify phase
   */
  private async executeFortifyPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void> {
    console.log(`[AI ${player.username}] Executing fortify phase`);
    await this.strategy.executeFortifyPhase(game, player, territories);
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
