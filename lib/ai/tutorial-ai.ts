import type { Territory, Player } from '@/types/game';
import { areTerritoriesAdjacent } from '@/constants/map';

/**
 * Tutorial AI - Simple, Predictable Opponent
 *
 * Designed to teach players, not to win aggressively. All decision functions
 * are pure (no side effects) and deterministic for consistent teaching experience.
 */

/**
 * AI decision for placing armies during reinforcement phase
 */
export interface AIPlaceArmiesDecision {
  /** Territory ID where armies should be placed */
  territoryId: string;
  /** Number of armies to place */
  count: number;
}

/**
 * AI decision for attacking during attack phase
 */
export interface AIAttackDecision {
  /** Territory ID to attack from */
  fromTerritoryId: string;
  /** Territory ID to attack */
  toTerritoryId: string;
}

/**
 * AI decision for fortifying during fortify phase
 */
export interface AIFortifyDecision {
  /** Territory ID to move armies from */
  fromTerritoryId: string;
  /** Territory ID to move armies to */
  toTerritoryId: string;
  /** Number of armies to move */
  count: number;
}

/**
 * Decide where to place armies during reinforcement phase
 *
 * Strategy: Distribute armies evenly across weakest territories
 *
 * @param aiPlayer - The AI player with armies_available to place
 * @param territories - All territories in the game
 * @returns Array of placement decisions (territory ID + count)
 *
 * @remarks
 * - Pure function - does not mutate input territories
 * - Prioritizes territories with lowest army counts first
 * - Places one army at a time in round-robin fashion for balanced distribution
 * - Consolidates decisions to minimize database operations
 * - Returns empty array if player has no armies or no owned territories
 *
 * @example
 * ```typescript
 * const decisions = decidePlaceArmies(aiPlayer, territories);
 * // Returns: [{ territoryId: 'alaska', count: 3 }, { territoryId: 'alberta', count: 2 }]
 * ```
 */
export function decidePlaceArmies(
  aiPlayer: Player,
  territories: Territory[]
): AIPlaceArmiesDecision[] {
  // Clone territories to avoid mutation
  const aiTerritories = territories
    .filter((t) => t.owner_id === aiPlayer.id)
    .map(t => ({ ...t }))
    .sort((a, b) => a.army_count - b.army_count);

  const decisions: AIPlaceArmiesDecision[] = [];
  let armiesLeft = aiPlayer.armies_available;

  // Place one army at a time on weakest territories
  while (armiesLeft > 0 && aiTerritories.length > 0) {
    for (const territory of aiTerritories) {
      if (armiesLeft === 0) break;

      decisions.push({
        territoryId: territory.id,
        count: 1,
      });
      territory.army_count += 1;
      armiesLeft -= 1;
    }
  }

  // Consolidate decisions by territory
  const consolidated = new Map<string, number>();
  for (const decision of decisions) {
    const current = consolidated.get(decision.territoryId) || 0;
    consolidated.set(decision.territoryId, current + decision.count);
  }

  return Array.from(consolidated.entries()).map(([territoryId, count]) => ({
    territoryId,
    count,
  }));
}

/**
 * Decide which territory to attack during attack phase
 *
 * Strategy: Attack weakest adjacent enemy from strongest AI territory
 *
 * @param aiPlayer - The AI player making the attack decision
 * @param territories - All territories in the game
 * @returns Attack decision (from/to territory IDs) or null if no valid attack
 *
 * @remarks
 * - Pure function - does not mutate input territories
 * - Only attacks from territories with 2+ armies (leaving 1 behind)
 * - Prioritizes attacking weakest enemy territories first (highest success chance)
 * - Prioritizes attacking from strongest AI territories first (more armies = better odds)
 * - Returns null if no valid adjacent attacks available
 * - Does NOT execute the attack - only returns the decision
 *
 * @example
 * ```typescript
 * const attack = decideAttack(aiPlayer, territories);
 * // Returns: { fromTerritoryId: 'kamchatka', toTerritoryId: 'alaska' } or null
 * ```
 */
export function decideAttack(
  aiPlayer: Player,
  territories: Territory[]
): AIAttackDecision | null {
  const aiTerritories = territories
    .filter((t) => t.owner_id === aiPlayer.id && t.army_count >= 2)
    .sort((a, b) => b.army_count - a.army_count);

  const enemyTerritories = territories.filter((t) => t.owner_id !== aiPlayer.id);

  // Find valid attacks (AI territory adjacent to enemy)
  for (const aiTerritory of aiTerritories) {
    const adjacentEnemies = enemyTerritories
      .filter((enemy) =>
        areTerritoriesAdjacent(aiTerritory.territory_name, enemy.territory_name)
      )
      .sort((a, b) => a.army_count - b.army_count);

    if (adjacentEnemies.length > 0) {
      return {
        fromTerritoryId: aiTerritory.id,
        toTerritoryId: adjacentEnemies[0].id,
      };
    }
  }

  return null;
}

/**
 * Decide if AI should continue attacking this turn
 *
 * Strategy: Limit to 2 attacks per turn to keep tutorial simple
 *
 * @param attackCount - Number of attacks already executed this turn
 * @returns true if AI should attempt another attack, false otherwise
 *
 * @remarks
 * - Pure function - deterministic based on attack count
 * - Tutorial AI is intentionally limited to 2 attacks per turn
 * - Prevents AI from being too aggressive and overwhelming new players
 * - Can be adjusted via this limit for different tutorial difficulty levels
 *
 * @example
 * ```typescript
 * shouldContinueAttacking(0); // true
 * shouldContinueAttacking(1); // true
 * shouldContinueAttacking(2); // false
 * ```
 */
export function shouldContinueAttacking(attackCount: number): boolean {
  // Limit to 2 attacks per turn to keep tutorial simple
  return attackCount < 2;
}

/**
 * Decide fortify move
 *
 * Strategy: Move armies from safe rear territories to front-line
 *
 * @param aiPlayer - The AI player making the fortify decision
 * @param territories - All territories in the game
 * @returns Fortify decision (from/to/count) or null if no valid fortify move
 *
 * @remarks
 * - Identifies front-line territories (adjacent to enemy territories)
 * - Identifies rear territories (not adjacent to enemies, with 2+ armies, adjacent to front-line)
 * - Moves armies from highest-army rear to lowest-army front-line
 * - Only fortifies if source and destination are adjacent
 * - Moves half of available armies (rounded down), leaving 1 army behind
 */
export function decideFortify(
  aiPlayer: Player,
  territories: Territory[]
): AIFortifyDecision | null {
  const aiTerritories = territories.filter((t) => t.owner_id === aiPlayer.id);
  const enemyTerritories = territories.filter((t) => t.owner_id !== aiPlayer.id);

  // Find front-line territories (adjacent to enemies)
  const frontLine = aiTerritories.filter((territory) =>
    enemyTerritories.some((enemy) =>
      areTerritoriesAdjacent(territory.territory_name, enemy.territory_name)
    )
  );

  // Find rear territories (not adjacent to enemies, with 2+ armies)
  const rear = aiTerritories.filter(
    (territory) =>
      territory.army_count >= 2 &&
      !frontLine.some((f) => f.id === territory.id) &&
      frontLine.some((f) =>
        areTerritoriesAdjacent(territory.territory_name, f.territory_name)
      )
  );

  if (rear.length > 0 && frontLine.length > 0) {
    const source = rear.sort((a, b) => b.army_count - a.army_count)[0];
    const destination = frontLine.sort((a, b) => a.army_count - b.army_count)[0];

    // Only fortify if they're adjacent
    if (
      areTerritoriesAdjacent(source.territory_name, destination.territory_name)
    ) {
      return {
        fromTerritoryId: source.id,
        toTerritoryId: destination.id,
        count: Math.floor((source.army_count - 1) / 2), // Move half
      };
    }
  }

  return null;
}
