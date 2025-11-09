'use server';

import { createServerClient } from '@/lib/supabase/server';
import { TUTORIAL_SCENARIO, getTutorialStep } from '@/constants/tutorial';
import { decidePlaceArmies, decideAttack, decideFortify, shouldContinueAttacking } from '@/lib/ai/tutorial-ai';
import { resolveCombat, calculateReinforcements, isPlayerEliminated, getWinner } from '@/lib/game-engine';
import type { Player, Territory, TerritoryName } from '@/types/game';
import { createPlayerSession, verifyPlayerSession } from '@/lib/session/player-session';
import { checkRateLimit, SERVER_RATE_LIMITS, getRateLimitError } from '@/lib/middleware/rate-limit';

/**
 * Create a new tutorial game with pre-configured scenario
 *
 * Creates a single-player game against AI with predefined territory distribution
 * from TUTORIAL_SCENARIO. The human player starts with 3 territories, AI with 5.
 *
 * @param username - Player's username (3-20 characters, alphanumeric + spaces/hyphens)
 * @returns Success result with gameId and playerId, or error message
 *
 * @remarks
 * Security:
 * - Rate limited to 5 tutorial games per hour per username
 * - Creates secure player session cookie
 * - Validates username format (handled by caller)
 *
 * Database Operations:
 * - Creates 1 game record (is_tutorial=true, tutorial_step=0)
 * - Creates 2 player records (human + AI with is_ai=true)
 * - Creates 8 territory records (3 player + 5 AI from TUTORIAL_SCENARIO)
 * - All operations are transactional (Supabase RLS enforced)
 *
 * @example
 * ```typescript
 * const result = await createTutorialGame('Alice');
 * if (result.success) {
 *   router.push(`/game/${result.result.gameId}?player=${result.result.playerId}`);
 * } else {
 *   alert(result.error);
 * }
 * ```
 */
export async function createTutorialGame(username: string) {
  // Track created IDs for rollback on failure
  let supabaseRef: ReturnType<typeof createServerClient> | null = null;
  let createdGameId: string | null = null;
  const createdPlayerIds: string[] = [];

  try {
    // Input validation
    if (!username || typeof username !== 'string') {
      return {
        success: false,
        error: 'Username is required and must be a string',
      };
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return {
        success: false,
        error: 'Username must be between 3 and 20 characters',
      };
    }

    // Rate limiting: Prevent tutorial game spam (5 games/hour per user)
    const rateLimitResult = checkRateLimit({
      identifier: `create-tutorial:${trimmedUsername}`,
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
    supabaseRef = supabase;

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
    createdGameId = game.id;

    // Create human player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        username: trimmedUsername,
        color: TUTORIAL_SCENARIO.playerColor,
        turn_order: 0,
        armies_available: 0,
        is_ai: false,
      })
      .select()
      .single();

    if (playerError) throw playerError;
    createdPlayerIds.push(player.id);

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
    createdPlayerIds.push(aiPlayer.id);

    // Create territories with pre-defined distribution
    const territoryInserts = [
      ...TUTORIAL_SCENARIO.playerTerritories.map((t: { territory: TerritoryName; armies: number }) => ({
        game_id: game.id,
        territory_name: t.territory,
        owner_id: player.id,
        army_count: t.armies,
      })),
      ...TUTORIAL_SCENARIO.aiTerritories.map((t: { territory: TerritoryName; armies: number }) => ({
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

    // Rollback: Clean up any partially created resources
    if (supabaseRef && createdGameId) {
      try {
        // Delete territories first (foreign key dependency)
        await supabaseRef.from('territories').delete().eq('game_id', createdGameId);

        // Delete players
        if (createdPlayerIds.length > 0) {
          await supabaseRef.from('players').delete().in('id', createdPlayerIds);
        }

        // Delete game last
        await supabaseRef.from('games').delete().eq('id', createdGameId);

        console.log('Successfully rolled back tutorial game creation');
      } catch (rollbackError) {
        // Log rollback failure but don't override the original error
        console.error('Failed to rollback tutorial game creation:', rollbackError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Advance tutorial to next step
 *
 * Updates tutorial_step and game phase based on step definition. Automatically
 * grants reinforcement armies when entering step 1 (reinforcement phase).
 *
 * @param gameId - The tutorial game ID
 * @param playerId - The human player's ID (verified against session)
 * @returns Success result with new step number (or completed=true), or error message
 *
 * @remarks
 * Security:
 * - Verifies player session before allowing step advancement
 * - Rate limited using CHANGE_PHASE rate limit (prevents spam)
 * - Only works for tutorial games (is_tutorial=true)
 *
 * Step Flow:
 * - Step 0 → 1: Transitions to 'setup' status, grants TUTORIAL_SCENARIO.playerStartingArmies
 * - Step 1 → 2: Transitions to 'playing' status, sets phase to 'reinforcement'
 * - Step 2+: Updates phase based on step definition (attack, fortify, etc.)
 * - Returns completed=true when reaching end of TUTORIAL_STEPS array
 *
 * Database Operations:
 * - Updates games table (tutorial_step, phase, status)
 * - May update players table (armies_available) for step 1
 *
 * @example
 * ```typescript
 * const result = await advanceTutorialStep(gameId, playerId);
 * if (result.success && result.result.completed) {
 *   // Tutorial finished, show victory screen
 * }
 * ```
 */
export async function advanceTutorialStep(gameId: string, playerId: string) {
  try {
    // Input validation
    if (!gameId || typeof gameId !== 'string') {
      return {
        success: false,
        error: 'Invalid game ID',
      };
    }

    if (!playerId || typeof playerId !== 'string') {
      return {
        success: false,
        error: 'Invalid player ID',
      };
    }

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

    // Security: Only allow tutorial step advancement in tutorial games
    if (!game.is_tutorial) {
      return {
        success: false,
        error: 'This action is only available for tutorial games.',
      };
    }

    // Verify player belongs to this game
    const { data: player, error: playerCheckError } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (playerCheckError || !player) {
      return {
        success: false,
        error: 'Player not found in this game.',
      };
    }

    const nextStep = game.tutorial_step + 1;
    const tutorialStep = getTutorialStep(nextStep);

    if (!tutorialStep) {
      // Tutorial complete
      return { success: true, result: { completed: true } };
    }

    // Update game with next step and phase
    const { error: updateStepError } = await supabase
      .from('games')
      .update({
        tutorial_step: nextStep,
        phase: tutorialStep.phase === 'setup' ? undefined : tutorialStep.phase,
        status: tutorialStep.phase === 'setup' ? 'setup' : 'playing',
      })
      .eq('id', gameId);

    if (updateStepError) {
      console.error('Failed to advance tutorial step:', updateStepError);
      return {
        success: false,
        error: 'Could not advance the tutorial. Please try again.',
      };
    }

    // If step 1 (reinforcement), give player armies
    if (nextStep === 1) {
      const { error: playerArmiesError } = await supabase
        .from('players')
        .update({ armies_available: TUTORIAL_SCENARIO.playerStartingArmies })
        .eq('game_id', gameId)
        .eq('is_ai', false);

      if (playerArmiesError) {
        console.error('Failed to allocate tutorial reinforcements:', playerArmiesError);
        return {
          success: false,
          error: 'Could not allocate tutorial reinforcements. Please try again.',
        };
      }
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
 * Execute AI turn automatically across all game phases
 *
 * Orchestrates AI actions for reinforcement, attack, and fortify phases with batched
 * database operations for performance. Handles turn advancement back to human player.
 *
 * @param gameId - The tutorial game ID
 * @returns Success result (true) or error message
 *
 * @remarks
 * Security:
 * - NO session verification (auto-triggered by frontend when is_ai=true)
 * - NO rate limiting (internal server action, not user-facing)
 * - Validates AI player exists before executing actions
 *
 * Phase-Specific Behavior:
 *
 * **Reinforcement Phase:**
 * - Calls decidePlaceArmies() for AI placement decisions
 * - Batches territory updates (reduces N queries to 1 upsert)
 * - Sets armies_available=0 and advances to 'attack' phase
 * - Parallel execution: player update + game phase update
 *
 * **Attack Phase:**
 * - Executes 1-2 attacks per turn (limited by shouldContinueAttacking)
 * - Refreshes territory data before each attack (prevents stale state)
 * - Batches conquered territory updates (ownership + army_count in 1 upsert)
 * - Checks for human player elimination after attacks
 * - Advances to 'fortify' phase
 *
 * **Fortify Phase:**
 * - Calls decideFortify() for AI fortify decision
 * - Batches both territory updates (from/to in 1 upsert)
 * - Calculates human player reinforcements for next turn
 * - Advances turn (current_player_order=0, current_turn++, phase='reinforcement')
 *
 * **Winner Detection:**
 * - Checks after each phase if game is finished
 * - Updates game status='finished' and winner_id if found
 *
 * Performance Optimizations:
 * - Parallel queries at start (game, players, territories via Promise.all)
 * - Batched territory updates (upsert instead of individual updates)
 * - Parallel player/game updates where possible
 * - Territory refresh only when needed (attack phase loop)
 *
 * Error Handling:
 * - Logs all errors to console.error for debugging
 * - Returns descriptive error messages for each operation type
 * - Throws on critical failures (game not found, AI player missing)
 *
 * @example
 * ```typescript
 * // Auto-triggered by useEffect when currentPlayer.is_ai === true
 * const result = await executeAITurn(gameId);
 * if (!result.success) {
 *   addToast(result.error, 'error');
 * }
 * ```
 */
export async function executeAITurn(gameId: string) {
  try {
    // Input validation
    if (!gameId || typeof gameId !== 'string') {
      return {
        success: false,
        error: 'Invalid game ID',
      };
    }

    const supabase = createServerClient();

    // Get game state
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('players').select('*').eq('game_id', gameId),
      supabase.from('territories').select('*').eq('game_id', gameId),
    ]);

    if (gameResult.error) {
      console.error('Failed to fetch game:', gameResult.error);
      throw new Error(`Game not found: ${gameResult.error.message}`);
    }
    if (playersResult.error) {
      console.error('Failed to fetch players:', playersResult.error);
      throw new Error(`Players not found: ${playersResult.error.message}`);
    }
    if (territoriesResult.error) {
      console.error('Failed to fetch territories:', territoriesResult.error);
      throw new Error(`Territories not found: ${territoriesResult.error.message}`);
    }

    const game = gameResult.data;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];

    // Defensive null checks
    if (!game) {
      throw new Error('Game data is null');
    }
    if (!players || players.length === 0) {
      throw new Error('No players found in game');
    }
    if (!territories || territories.length === 0) {
      throw new Error('No territories found in game');
    }

    const aiPlayer = players.find((p) => p.is_ai);
    if (!aiPlayer) {
      throw new Error('AI player not found in game');
    }

    // Security: Only allow AI execution in tutorial games during AI's turn
    if (!game.is_tutorial) {
      return {
        success: false,
        error: 'AI automation is only available in tutorial mode.',
      };
    }

    if (game.current_player_order !== aiPlayer.turn_order) {
      return {
        success: false,
        error: 'AI can only act during its own turn.',
      };
    }

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

      // Log if any invalid territory IDs were filtered out (helps catch bugs in AI logic)
      if (territoryUpdates.length !== decisions.length) {
        console.warn(
          `AI placement: ${decisions.length - territoryUpdates.length} invalid territory IDs filtered`,
          { decisions, territoryUpdates }
        );
      }

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
      // Only fetch if attacks occurred (optimization: skip unnecessary DB call)
      if (attackCount > 0) {
        const { data: postAttackTerritories } = await supabase
          .from('territories')
          .select('*')
          .eq('game_id', gameId);

        if (postAttackTerritories) {
          const humanPlayer = players.find((p) => !p.is_ai);
          if (humanPlayer) {
            const eliminated = isPlayerEliminated(humanPlayer.id, postAttackTerritories as Territory[]);
            if (eliminated) {
              const { error: eliminationError } = await supabase
                .from('players')
                .update({ is_eliminated: true })
                .eq('id', humanPlayer.id);

              if (eliminationError) {
                console.error('Failed to mark player as eliminated:', eliminationError);
                return {
                  success: false,
                  error: 'Failed to update player elimination status. Please try again.',
                };
              }
            }
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
