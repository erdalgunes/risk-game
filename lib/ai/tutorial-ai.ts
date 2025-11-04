import type { Territory, Player } from '@/types/game';
import { areTerritoriesAdjacent } from '@/constants/map';

/**
 * Tutorial AI - Simple, Predictable Opponent
 * Designed to teach players, not to win aggressively
 */

export interface AIPlaceArmiesDecision {
  territoryId: string;
  count: number;
}

export interface AIAttackDecision {
  fromTerritoryId: string;
  toTerritoryId: string;
}

export interface AIFortifyDecision {
  fromTerritoryId: string;
  toTerritoryId: string;
  count: number;
}

/**
 * Decide where to place armies during reinforcement
 * Strategy: Distribute evenly, prioritize territories with 1 army
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
 * Decide which territory to attack
 * Strategy: Attack weakest adjacent enemy territory from strongest AI territory
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
 * Decide if AI should continue attacking
 * Strategy: Attack 1-2 times per turn (not too aggressive)
 */
export function shouldContinueAttacking(attackCount: number): boolean {
  // Limit to 2 attacks per turn to keep tutorial simple
  return attackCount < 2;
}

/**
 * Decide fortify move
 * Strategy: Move armies from safe rear territories to front-line
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
