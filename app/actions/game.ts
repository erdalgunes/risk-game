'use server';

import { createServerClient } from '@/lib/supabase/server';
import { TERRITORIES } from '@/constants/map';
import {
  calculateInitialArmies,
  distributeTerritoriesRandomly,
  calculateReinforcements,
  resolveCombat,
  isPlayerEliminated,
  getWinner
} from '@/lib/game-engine';
import { canAttack, canFortify } from '@/lib/game-engine/validation';
import type { Player, Territory, AttackResult } from '@/types/game';

/**
 * Start the game - distribute territories and set initial armies
 */
export async function startGame(gameId: string) {
  try {
    const supabase = createServerClient();

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order');

    if (playersError || !players || players.length < 2) {
      throw new Error('Not enough players to start game');
    }

    // Distribute territories
    const territoryNames = TERRITORIES.map((t) => t.name);
    const distribution = distributeTerritoriesRandomly(
      territoryNames,
      players as Player[]
    );

    // Create territory records
    const territoryInserts = Array.from(distribution.entries()).map(
      ([name, ownerId]) => ({
        game_id: gameId,
        territory_name: name as string,
        owner_id: ownerId,
        army_count: 1, // Start with 1 army per territory
      })
    );

    const { error: territoriesError } = await supabase
      .from('territories')
      .insert(territoryInserts);

    if (territoriesError) throw territoriesError;

    // Calculate remaining armies for setup
    const initialArmies = calculateInitialArmies(players.length);
    const territoriesPerPlayer = Math.ceil(territoryNames.length / players.length);

    // Update players with available armies (total - already placed)
    for (const player of players) {
      const armiesAvailable = initialArmies - territoriesPerPlayer;
      await supabase
        .from('players')
        .update({ armies_available: armiesAvailable })
        .eq('id', player.id);
    }

    // Update game status
    const { error: gameError } = await supabase
      .from('games')
      .update({
        status: 'setup',
        current_player_order: 0,
      })
      .eq('id', gameId);

    if (gameError) throw gameError;

    return { success: true };
  } catch (error) {
    console.error('Error starting game:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Place armies on a territory during setup or reinforcement
 */
export async function placeArmies(
  gameId: string,
  playerId: string,
  territoryId: string,
  count: number
) {
  try {
    const supabase = createServerClient();

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !player) throw new Error('Player not found');

    // Verify player has enough armies
    if (player.armies_available < count) {
      throw new Error('Not enough armies available');
    }

    // Get territory
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territoryId)
      .single();

    if (territoryError || !territory) throw new Error('Territory not found');

    // Verify ownership
    if (territory.owner_id !== playerId) {
      throw new Error('You do not own this territory');
    }

    // Update territory
    await supabase
      .from('territories')
      .update({ army_count: territory.army_count + count })
      .eq('id', territoryId);

    // Update player
    await supabase
      .from('players')
      .update({ armies_available: player.armies_available - count })
      .eq('id', playerId);

    // Check if we should transition from setup to playing
    const { data: game } = await supabase
      .from('games')
      .select('status')
      .eq('id', gameId)
      .single();

    if (game?.status === 'setup') {
      // Check if all players have placed all their armies
      const { data: allPlayers } = await supabase
        .from('players')
        .select('armies_available')
        .eq('game_id', gameId);

      const allArmiesPlaced = allPlayers?.every((p) => p.armies_available === 0);

      if (allArmiesPlaced) {
        // Transition to playing phase
        await supabase
          .from('games')
          .update({
            status: 'playing',
            phase: 'reinforcement',
          })
          .eq('id', gameId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error placing armies:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * End current turn and move to next player
 */
export async function endTurn(gameId: string, playerId: string) {
  try {
    const supabase = createServerClient();

    // Get game and players
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_eliminated', false)
      .order('turn_order');

    if (playersError || !players) throw new Error('Players not found');

    // Find current player
    const currentPlayer = players.find(
      (p) => p.turn_order === game.current_player_order
    );

    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    // Move to next player
    const nextPlayerOrder = (game.current_player_order + 1) % players.length;
    const nextPlayer = players.find((p) => p.turn_order === nextPlayerOrder);

    if (!nextPlayer) throw new Error('Next player not found');

    // Get territories for reinforcement calculation
    const { data: territories } = await supabase
      .from('territories')
      .select('*')
      .eq('game_id', gameId);

    const reinforcements = calculateReinforcements(
      nextPlayer as Player,
      (territories as Territory[]) || []
    );

    // Update next player with reinforcements
    await supabase
      .from('players')
      .update({ armies_available: reinforcements })
      .eq('id', nextPlayer.id);

    // Update game
    await supabase
      .from('games')
      .update({
        current_player_order: nextPlayerOrder,
        current_turn: game.current_turn + 1,
        phase: 'reinforcement',
      })
      .eq('id', gameId);

    return { success: true };
  } catch (error) {
    console.error('Error ending turn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Change game phase
 */
export async function changePhase(
  gameId: string,
  playerId: string,
  newPhase: 'attack' | 'fortify'
) {
  try {
    const supabase = createServerClient();

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');

    // Get current player
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order');

    if (playersError || !players) throw new Error('Players not found');

    const currentPlayer = players.find(
      (p) => p.turn_order === game.current_player_order
    );

    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    // Update game phase
    await supabase
      .from('games')
      .update({ phase: newPhase })
      .eq('id', gameId);

    return { success: true };
  } catch (error) {
    console.error('Error changing phase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Attack a territory
 */
export async function attackTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string
) {
  try {
    const supabase = createServerClient();

    // Get game, player, and territories
    const [gameResult, playerResult, fromTerritoryResult, toTerritoryResult] =
      await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('players').select('*').eq('id', playerId).single(),
        supabase
          .from('territories')
          .select('*')
          .eq('id', fromTerritoryId)
          .single(),
        supabase.from('territories').select('*').eq('id', toTerritoryId).single(),
      ]);

    if (gameResult.error) throw gameResult.error;
    if (playerResult.error) throw playerResult.error;
    if (fromTerritoryResult.error) throw fromTerritoryResult.error;
    if (toTerritoryResult.error) throw toTerritoryResult.error;

    const game = gameResult.data;
    const player = playerResult.data as Player;
    const fromTerritory = fromTerritoryResult.data as Territory;
    const toTerritory = toTerritoryResult.data as Territory;

    // Validate attack
    const validation = canAttack(game, player, fromTerritory, toTerritory);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Resolve combat
    const result: AttackResult = resolveCombat(
      fromTerritory.army_count,
      toTerritory.army_count
    );

    // Update territories
    await supabase
      .from('territories')
      .update({ army_count: fromTerritory.army_count - result.attackerLosses })
      .eq('id', fromTerritoryId);

    if (result.conquered) {
      // Attacker conquers territory
      const armiesToMove = fromTerritory.army_count - result.attackerLosses - 1;
      await supabase
        .from('territories')
        .update({
          owner_id: playerId,
          army_count: armiesToMove,
        })
        .eq('id', toTerritoryId);

      // Update attacker territory (leave 1 army)
      await supabase
        .from('territories')
        .update({ army_count: 1 })
        .eq('id', fromTerritoryId);
    } else {
      // Defender survives
      await supabase
        .from('territories')
        .update({ army_count: toTerritory.army_count - result.defenderLosses })
        .eq('id', toTerritoryId);
    }

    // Check for player elimination
    if (toTerritory.owner_id) {
      const { data: defenderTerritories } = await supabase
        .from('territories')
        .select('*')
        .eq('game_id', gameId);

      if (
        defenderTerritories &&
        isPlayerEliminated(toTerritory.owner_id, defenderTerritories as Territory[])
      ) {
        await supabase
          .from('players')
          .update({ is_eliminated: true })
          .eq('id', toTerritory.owner_id);
      }
    }

    // Check for winner
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId);

    const { data: allTerritories } = await supabase
      .from('territories')
      .select('*')
      .eq('game_id', gameId);

    if (allPlayers && allTerritories) {
      const winner = getWinner(
        allPlayers as Player[],
        allTerritories as Territory[]
      );
      if (winner) {
        await supabase
          .from('games')
          .update({
            status: 'finished',
            winner_id: winner.id,
          })
          .eq('id', gameId);
      }
    }

    // Log action
    await supabase.from('game_actions').insert({
      game_id: gameId,
      player_id: playerId,
      action_type: 'attack',
      payload: {
        from: fromTerritoryId,
        to: toTerritoryId,
        result,
      },
    });

    return { success: true, result };
  } catch (error) {
    console.error('Error attacking territory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fortify - move armies between connected territories
 */
export async function fortifyTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  armyCount: number
) {
  try {
    const supabase = createServerClient();

    // Get game, player, territories, and all territories for connectivity check
    const [gameResult, playerResult, fromTerritoryResult, toTerritoryResult, allTerritoriesResult] =
      await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('players').select('*').eq('id', playerId).single(),
        supabase.from('territories').select('*').eq('id', fromTerritoryId).single(),
        supabase.from('territories').select('*').eq('id', toTerritoryId).single(),
        supabase.from('territories').select('*').eq('game_id', gameId),
      ]);

    if (gameResult.error) throw gameResult.error;
    if (playerResult.error) throw playerResult.error;
    if (fromTerritoryResult.error) throw fromTerritoryResult.error;
    if (toTerritoryResult.error) throw toTerritoryResult.error;
    if (allTerritoriesResult.error) throw allTerritoriesResult.error;

    const game = gameResult.data;
    const player = playerResult.data as Player;
    const fromTerritory = fromTerritoryResult.data as Territory;
    const toTerritory = toTerritoryResult.data as Territory;
    const allTerritories = allTerritoriesResult.data as Territory[];

    // Validate fortify
    const validation = canFortify(
      game,
      player,
      fromTerritory,
      toTerritory,
      armyCount,
      allTerritories
    );

    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Move armies
    await supabase
      .from('territories')
      .update({ army_count: fromTerritory.army_count - armyCount })
      .eq('id', fromTerritoryId);

    await supabase
      .from('territories')
      .update({ army_count: toTerritory.army_count + armyCount })
      .eq('id', toTerritoryId);

    // Log action
    await supabase.from('game_actions').insert({
      game_id: gameId,
      player_id: playerId,
      action_type: 'fortify',
      payload: {
        from: fromTerritoryId,
        to: toTerritoryId,
        armies: armyCount,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error fortifying territory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
