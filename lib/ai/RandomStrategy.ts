import type { Game, Player, Territory } from '@/types/game';
import type { AIStrategy } from '@/types/ai';
import {
  placeArmies,
  attackTerritory,
  fortifyTerritory,
  changePhase,
  endTurn,
} from '@/app/actions/game';
import {
  getPlayerTerritories,
  getAdjacentEnemyTerritories,
  getInteriorTerritories,
  getBorderTerritories,
  checkTerritoriesConnected,
  randomElement,
  randomInt,
  shuffleArray,
  delay,
} from './utils';

/**
 * Random AI strategy - makes random valid moves
 * Good for beginners to practice against
 */
export class RandomStrategy implements AIStrategy {
  private readonly thinkingDelay: number;
  private readonly maxAttacksPerTurn: number;

  constructor(thinkingDelay = 800, maxAttacksPerTurn = 15) {
    this.thinkingDelay = thinkingDelay;
    this.maxAttacksPerTurn = maxAttacksPerTurn;
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
  private logError(player: Player, message: string, error?: string): void {
    console.error(`[AI ${player.username}] ${message}`, error || '');
  }

  /**
   * Execute reinforcement phase - distribute armies randomly
   */
  async executeReinforcementPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void> {
    this.log(player, 'Starting reinforcement phase');

    const myTerritories = getPlayerTerritories(player.id, territories);
    if (myTerritories.length === 0) {
      this.logError(player, 'No territories owned!');
      return;
    }

    let armiesRemaining = player.armies_available;

    while (armiesRemaining > 0) {
      await delay(this.thinkingDelay);

      // Pick random territory
      const territory = randomElement(myTerritories);
      if (!territory) break;

      // Place 1-3 armies randomly
      const armiesToPlace = Math.min(randomInt(1, 3), armiesRemaining);

      this.log(player, `Placing ${armiesToPlace} armies on ${territory.territory_name}`);

      const result = await placeArmies(
        game.id,
        player.id,
        territory.id,
        armiesToPlace
      );

      if (!result.success) {
        this.logError(player, 'Failed to place armies:', result.error);
        break;
      }

      armiesRemaining -= armiesToPlace;
    }

    this.log(player, 'Reinforcement phase complete');
  }

  /**
   * Execute attack phase - attack random adjacent enemies
   */
  async executeAttackPhase(
    game: Game,
    player: Player,
    allPlayers: Player[],
    territories: Territory[]
  ): Promise<void> {
    this.log(player, 'Starting attack phase');

    const myTerritories = getPlayerTerritories(player.id, territories);

    // Get territories that can attack (2+ armies)
    const attackableTerritories = myTerritories.filter(
      (t) => t.army_count >= 2
    );

    if (attackableTerritories.length === 0) {
      this.log(player, 'No territories can attack');
      await this.skipToFortify(game, player);
      return;
    }

    // Shuffle to randomize attack order
    const shuffledTerritories = shuffleArray(attackableTerritories);

    let attackCount = 0;
    const maxAttacks = randomInt(3, 7); // Random number of attacks

    for (const from of shuffledTerritories) {
      if (attackCount >= maxAttacks || attackCount >= this.maxAttacksPerTurn) {
        break;
      }

      // Get adjacent enemies
      const adjacentEnemies = getAdjacentEnemyTerritories(from, territories);
      if (adjacentEnemies.length === 0) continue;

      // Pick random enemy
      const to = randomElement(adjacentEnemies);
      if (!to) continue;

      await delay(this.thinkingDelay);

      this.log(player, `Attacking ${to.territory_name} from ${from.territory_name}`);

      const result = await attackTerritory(game.id, player.id, from.id, to.id);

      if (!result.success) {
        this.logError(player, 'Attack failed:', result.error);
        continue;
      }

      attackCount++;

      // Check if game is finished
      if (result.result?.gameFinished) {
        this.log(player, `Game finished! Winner: ${result.result.winner?.username}`);
        return;
      }

      // Log conquest
      if (result.result?.conquered) {
        this.log(player, `Conquered ${to.territory_name}!`);
      }
    }

    this.log(player, `Attack phase complete (${attackCount} attacks)`);

    // Move to fortify phase
    await this.skipToFortify(game, player);
  }

  /**
   * Execute fortify phase - optionally move armies from interior to border
   */
  async executeFortifyPhase(
    game: Game,
    player: Player,
    territories: Territory[]
  ): Promise<void> {
    this.log(player, 'Starting fortify phase');

    // 50% chance to skip fortification
    // NOSONAR: Math.random() is safe for game AI decisions (not cryptographic use)
    if (Math.random() < 0.5) {
      this.log(player, 'Skipping fortification');
      await this.finishTurn(game, player);
      return;
    }

    const interiorTerritories = getInteriorTerritories(
      player.id,
      territories
    ).filter((t) => t.army_count > 1);

    const borderTerritories = getBorderTerritories(player.id, territories);

    if (interiorTerritories.length === 0 || borderTerritories.length === 0) {
      this.log(player, 'No fortification opportunities');
      await this.finishTurn(game, player);
      return;
    }

    // Pick random interior territory
    const from = randomElement(interiorTerritories);
    if (!from) {
      await this.finishTurn(game, player);
      return;
    }

    // Find connected border territories
    const connectedBorders = borderTerritories.filter((to) =>
      checkTerritoriesConnected(from, to, player.id, territories)
    );

    if (connectedBorders.length === 0) {
      this.log(player, 'No connected borders found');
      await this.finishTurn(game, player);
      return;
    }

    // Pick random border territory
    const to = randomElement(connectedBorders);
    if (!to) {
      await this.finishTurn(game, player);
      return;
    }

    // Move random amount of armies (leave at least 1)
    const maxArmies = from.army_count - 1;
    const armiesToMove = randomInt(1, maxArmies);

    await delay(this.thinkingDelay);

    this.log(player, `Fortifying ${to.territory_name} from ${from.territory_name} (${armiesToMove} armies)`);

    const result = await fortifyTerritory(
      game.id,
      player.id,
      from.id,
      to.id,
      armiesToMove
    );

    if (!result.success) {
      this.logError(player, 'Fortification failed:', result.error);
    }

    this.log(player, 'Fortify phase complete');

    await this.finishTurn(game, player);
  }

  /**
   * Skip to fortify phase
   */
  private async skipToFortify(game: Game, player: Player): Promise<void> {
    await delay(this.thinkingDelay / 2);
    this.log(player, 'Skipping to fortify phase');

    const result = await changePhase(game.id, player.id, 'fortify');
    if (!result.success) {
      this.logError(player, 'Failed to change phase:', result.error);
    }
  }

  /**
   * End turn
   */
  private async finishTurn(game: Game, player: Player): Promise<void> {
    await delay(this.thinkingDelay / 2);
    this.log(player, 'Ending turn');

    const result = await endTurn(game.id, player.id);
    if (!result.success) {
      this.logError(player, 'Failed to end turn:', result.error);
    }
  }
}
