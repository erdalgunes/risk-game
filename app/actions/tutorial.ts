'use server';

import { createServerClient } from '@/lib/supabase/server';
import { TUTORIAL_SCENARIO, getTutorialStep } from '@/constants/tutorial';
import { decidePlaceArmies, decideAttack, decideFortify, shouldContinueAttacking } from '@/lib/ai/tutorial-ai';
import { resolveCombat, calculateReinforcements, isPlayerEliminated, getWinner } from '@/lib/game-engine';
import type { Player, Territory } from '@/types/game';
import { createPlayerSession, verifyPlayerSession } from '@/lib/session/player-session';
import { checkRateLimit, SERVER_RATE_LIMITS, getRateLimitError } from '@/lib/middleware/rate-limit';

/**
 * Create a tutorial game with pre-configured scenario
 */
export async function createTutorialGame(username: string) {
  try {
    // Rate limiting: Prevent tutorial game spam (5 games/hour per user)
    const rateLimitResult = checkRateLimit({
      identifier: `create-tutorial:${username}`,
      limit: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
      };
    }

    const supabase = createServerClient();

    // Create tutorial game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        max_players: 2,
        status: 'setup',
        is_tutorial: true,
        tutorial_step: 0,
        current_player_order: 0,
      })
      .select()
      .single();

    if (gameError) throw gameError;

    // Create human player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        username,
        color: TUTORIAL_SCENARIO.playerColor,
        turn_order: 0,
        armies_available: 0,
        is_ai: false,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    // Create AI opponent
    const { data: aiPlayer, error: aiError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        username: 'Tutorial AI',
        color: TUTORIAL_SCENARIO.aiColor,
        turn_order: 1,
        armies_available: 0,
        is_ai: true,
      })
      .select()
      .single();

    if (aiError) throw aiError;

    // Create territories with pre-defined distribution
    const territoryInserts = [
      ...TUTORIAL_SCENARIO.playerTerritories.map((t) => ({
        game_id: game.id,
        territory_name: t.territory,
        owner_id: player.id,
        army_count: t.armies,
      })),
      ...TUTORIAL_SCENARIO.aiTerritories.map((t) => ({
        game_id: game.id,
        territory_name: t.territory,
        owner_id: aiPlayer.id,
        army_count: t.armies,
      })),
    ];

    const { error: territoriesError } = await supabase
      .from('territories')
      .insert(territoryInserts);

    if (territoriesError) throw territoriesError;

    // Create session cookie
    await createPlayerSession(game.id, player.id);

    return {
      success: true,
      result: {
        gameId: game.id,
        playerId: player.id,
      },
    };
  } catch (error) {
    console.error('Error creating tutorial game:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Advance tutorial to next step
 */
export async function advanceTutorialStep(gameId: string, playerId: string) {
  try {
    // Verify player session
    const isValidSession = await verifyPlayerSession(gameId, playerId);
    if (!isValidSession) {
      return {
        success: false,
        error: 'Invalid session. Please rejoin the game.',
      };
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit({
      identifier: `advance-tutorial:${playerId}`,
      ...SERVER_RATE_LIMITS.CHANGE_PHASE,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
      };
    }

    const supabase = createServerClient();

    // Get current game state
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');

    const nextStep = game.tutorial_step + 1;
    const tutorialStep = getTutorialStep(nextStep);

    if (!tutorialStep) {
      // Tutorial complete
      return { success: true, result: { completed: true } };
    }

    // Update game with next step and phase
    await supabase
      .from('games')
      .update({
        tutorial_step: nextStep,
        phase: tutorialStep.phase === 'setup' ? undefined : tutorialStep.phase,
        status: tutorialStep.phase === 'setup' ? 'setup' : 'playing',
      })
      .eq('id', gameId);

    // If step 1 (reinforcement), give player armies
    if (nextStep === 1) {
      await supabase
        .from('players')
        .update({ armies_available: TUTORIAL_SCENARIO.playerStartingArmies })
        .eq('game_id', gameId)
        .eq('is_ai', false);
    }

    return { success: true, result: { step: nextStep } };
  } catch (error) {
    console.error('Error advancing tutorial step:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute AI turn automatically
 */
export async function executeAITurn(gameId: string) {
  try {
    const supabase = createServerClient();

    // Get game state
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('players').select('*').eq('game_id', gameId),
      supabase.from('territories').select('*').eq('game_id', gameId),
    ]);

    if (gameResult.error) throw gameResult.error;
    if (playersResult.error) throw playersResult.error;
    if (territoriesResult.error) throw territoriesResult.error;

    const game = gameResult.data;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];

    const aiPlayer = players.find((p) => p.is_ai);
    if (!aiPlayer) throw new Error('AI player not found');

    const currentPhase = game.phase;

    // Execute AI actions based on phase
    if (currentPhase === 'reinforcement' && aiPlayer.armies_available > 0) {
      // AI places armies - OPTIMIZED: Batch territory updates
      const decisions = decidePlaceArmies(aiPlayer, territories);

      // Batch update territories (reduces N queries to 1)
      const territoryUpdates = decisions.map((decision) => {
        const territory = territories.find((t) => t.id === decision.territoryId);
        return {
          id: decision.territoryId,
          army_count: (territory?.army_count || 0) + decision.count,
        };
      }).filter(update => update.id); // Remove invalid entries

      if (territoryUpdates.length > 0) {
        const { error: updateError } = await supabase
          .from('territories')
          .upsert(territoryUpdates);

        if (updateError) {
          console.error('Failed to place AI armies:', updateError);
          throw new Error('AI turn failed: territory update');
        }
      }

      // Update player and game in parallel (reduces 2 sequential queries to 1 parallel)
      const [playerResult, phaseResult] = await Promise.all([
        supabase
          .from('players')
          .update({ armies_available: 0 })
          .eq('id', aiPlayer.id),
        supabase
          .from('games')
          .update({ phase: 'attack' })
          .eq('id', gameId),
      ]);

      if (playerResult.error) {
        console.error('Failed to update AI player:', playerResult.error);
        throw new Error('AI turn failed: player update');
      }

      if (phaseResult.error) {
        console.error('Failed to update game phase:', phaseResult.error);
        throw new Error('AI turn failed: phase update');
      }
    } else if (currentPhase === 'attack') {
      // AI attacks (1-2 times)
      let attackCount = 0;
      const maxAttacks = 2;

      while (attackCount < maxAttacks && shouldContinueAttacking(attackCount)) {
        // Refresh territories
        const { data: freshTerritories } = await supabase
          .from('territories')
          .select('*')
          .eq('game_id', gameId);

        if (!freshTerritories) break;

        const attackDecision = decideAttack(aiPlayer, freshTerritories as Territory[]);

        if (!attackDecision) break;

        const fromTerritory = freshTerritories.find(
          (t) => t.id === attackDecision.fromTerritoryId
        );
        const toTerritory = freshTerritories.find(
          (t) => t.id === attackDecision.toTerritoryId
        );

        if (!fromTerritory || !toTerritory) break;

        // Execute combat
        const result = resolveCombat(fromTerritory.army_count, toTerritory.army_count);

        // OPTIMIZED: Batch territory updates for attack (reduces 2-3 queries to 1)
        const territoryUpdates = [];

        if (result.conquered) {
          const armiesToMove = fromTerritory.army_count - result.attackerLosses - 1;
          // Conquered: Update both territories (source gets 1 army, destination gets remainder and ownership)
          territoryUpdates.push(
            { id: attackDecision.fromTerritoryId, army_count: 1 },
            {
              id: attackDecision.toTerritoryId,
              owner_id: aiPlayer.id,
              army_count: armiesToMove,
            }
          );
        } else {
          // Failed: Update both territories (apply losses)
          territoryUpdates.push(
            {
              id: attackDecision.fromTerritoryId,
              army_count: fromTerritory.army_count - result.attackerLosses,
            },
            {
              id: attackDecision.toTerritoryId,
              army_count: toTerritory.army_count - result.defenderLosses,
            }
          );
        }

        const { error: attackUpdateError } = await supabase
          .from('territories')
          .upsert(territoryUpdates);

        if (attackUpdateError) {
          console.error('Failed to update territories after attack:', attackUpdateError);
          throw new Error('AI turn failed: attack territory update');
        }

        attackCount++;
      }

      // Check if human player was eliminated during AI attacks
      const { data: postAttackTerritories } = await supabase
        .from('territories')
        .select('*')
        .eq('game_id', gameId);

      if (postAttackTerritories) {
        const humanPlayer = players.find((p) => !p.is_ai);
        if (humanPlayer) {
          const eliminated = isPlayerEliminated(humanPlayer.id, postAttackTerritories as Territory[]);
          if (eliminated) {
            await supabase
              .from('players')
              .update({ is_eliminated: true })
              .eq('id', humanPlayer.id);
          }
        }
      }

      // Move to fortify phase
      await supabase.from('games').update({ phase: 'fortify' }).eq('id', gameId);
    } else if (currentPhase === 'fortify') {
      // Refresh territories
      const { data: freshTerritories } = await supabase
        .from('territories')
        .select('*')
        .eq('game_id', gameId);

      // AI fortifies
      if (freshTerritories) {
        const fortifyDecision = decideFortify(aiPlayer, freshTerritories as Territory[]);

        if (fortifyDecision) {
          const fromTerritory = freshTerritories.find(
            (t) => t.id === fortifyDecision.fromTerritoryId
          ) as Territory;
          const toTerritory = freshTerritories.find(
            (t) => t.id === fortifyDecision.toTerritoryId
          ) as Territory;

          if (fromTerritory && toTerritory) {
            // OPTIMIZED: Batch both territory updates (reduces 2 queries to 1)
            const fortifyUpdates = [
              {
                id: fortifyDecision.fromTerritoryId,
                army_count: fromTerritory.army_count - fortifyDecision.count,
              },
              {
                id: fortifyDecision.toTerritoryId,
                army_count: toTerritory.army_count + fortifyDecision.count,
              },
            ];

            const { error: fortifyError } = await supabase
              .from('territories')
              .upsert(fortifyUpdates);

            if (fortifyError) {
              console.error('Failed to fortify territories:', fortifyError);
              throw new Error('AI turn failed: fortify update');
            }
          }
        }
      }

      // End AI turn - move back to player
      const { data: allTerritories } = await supabase
        .from('territories')
        .select('*')
        .eq('game_id', gameId);

      const humanPlayer = players.find((p) => !p.is_ai);

      if (humanPlayer && allTerritories) {
        const reinforcements = calculateReinforcements(
          humanPlayer,
          allTerritories as Territory[]
        );

        await supabase
          .from('players')
          .update({ armies_available: reinforcements })
          .eq('id', humanPlayer.id);

        await supabase
          .from('games')
          .update({
            current_player_order: 0,
            current_turn: game.current_turn + 1,
            phase: 'reinforcement',
          })
          .eq('id', gameId);
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
      const winner = getWinner(allPlayers as Player[], allTerritories as Territory[]);
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

    return { success: true };
  } catch (error) {
    console.error('Error executing AI turn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
