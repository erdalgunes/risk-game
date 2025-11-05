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
import type { Player, Territory, AttackResult, Game } from '@/types/game';
import { z } from 'zod';
import {
  startGameSchema,
  placeArmiesSchema,
  endTurnSchema,
  changePhaseSchema,
  attackSchema,
  fortifySchema,
  gameIdSchema,
  usernameSchema,
} from '@/lib/validation/schemas';
import { verifyPlayerSession, createPlayerSession } from '@/lib/session/player-session';
import { checkRateLimit, SERVER_RATE_LIMITS, getClientIP, getRateLimitError } from '@/lib/middleware/rate-limit';
import { headers } from 'next/headers';
import { getPhaseDelegate, transitionToPhase } from './phase-manager';
import type { PhaseContext } from './phases/PhaseDelegate';
import { ReinforcementPhaseDelegate } from './phases/ReinforcementPhaseDelegate';
import { AttackPhaseDelegate } from './phases/AttackPhaseDelegate';
import { FortifyPhaseDelegate } from './phases/FortifyPhaseDelegate';
import { createEventStore, type GameEventType } from '@/lib/event-sourcing/EventStore';
import { autoCreateSnapshot } from '@/lib/event-sourcing/snapshot-helpers';

/**
 * Create game and join as first player
 */
export async function createGameAction(username: string, color: string, maxPlayers: number = 4) {
  try {
    // Server-side rate limiting (IP-based)
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitResult = await checkRateLimit({
      identifier: `create-game:${clientIP}`,
      ...SERVER_RATE_LIMITS.CREATE_GAME,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
      };
    }

    const supabase = createServerClient();

    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        max_players: maxPlayers,
        status: 'waiting',
      })
      .select()
      .single();

    if (gameError) throw gameError;

    // Join as first player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        username: usernameSchema.parse(username),
        color,
        turn_order: 0,
        armies_available: 0,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    // Create session cookie
    await createPlayerSession(game.id, player.id);

    // Log event
    const eventStore = createEventStore(supabase);
    await eventStore.appendEvents(
      [
        {
          event_type: 'game_created',
          payload: { max_players: maxPlayers },
        },
        {
          event_type: 'player_joined',
          payload: { username, color, turn_order: 0 },
        },
      ],
      {
        game_id: game.id,
        player_id: player.id,
        correlation_id: game.id, // Use game_id as correlation for game creation
      }
    );

    return {
      success: true,
      result: {
        gameId: game.id,
        playerId: player.id
      }
    };
  } catch (error) {
    console.error('Error creating game:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Join an existing game
 */
export async function joinGameAction(gameId: string, username: string, color: string) {
  try {
    // Server-side rate limiting (IP-based)
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitResult = await checkRateLimit({
      identifier: `join-game:${clientIP}`,
      ...SERVER_RATE_LIMITS.JOIN_GAME,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
      };
    }

    // Validate inputs
    const validatedGameId = gameIdSchema.parse(gameId);
    const validatedUsername = usernameSchema.parse(username);

    const supabase = createServerClient();

    // Get current player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', validatedGameId);

    const turnOrder = count || 0;

    // Create player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: validatedGameId,
        username: validatedUsername,
        color,
        turn_order: turnOrder,
        armies_available: 0,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    // Create session cookie
    await createPlayerSession(validatedGameId, player.id);

    // Log event
    const eventStore = createEventStore(supabase);
    await eventStore.appendEvent(
      {
        event_type: 'player_joined',
        payload: { username: validatedUsername, color, turn_order: turnOrder },
      },
      {
        game_id: validatedGameId,
        player_id: player.id,
      }
    );

    return {
      success: true,
      result: {
        gameId: validatedGameId,
        playerId: player.id
      }
    };
  } catch (error) {
    console.error('Error joining game:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start the game - distribute territories and set initial armies
 */
export async function startGame(gameId: string) {
  try {
    // Validate input
    const validated = startGameSchema.parse({ gameId });

    // Server-side rate limiting (game-based)
    const rateLimitResult = await checkRateLimit({
      identifier: `start-game:${gameId}`,
      ...SERVER_RATE_LIMITS.START_GAME,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
      };
    }

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

    // Log events
    const eventStore = createEventStore(supabase);
    const territoryEvents = Array.from(distribution.entries()).map(
      ([territoryName, ownerId]) => ({
        event_type: 'territory_claimed' as const,
        payload: {
          territory_name: territoryName,
          owner_id: ownerId,
          initial_armies: 1,
        },
      })
    );

    await eventStore.appendEvents(
      [
        {
          event_type: 'game_started',
          payload: {
            player_count: players.length,
            territories_distributed: territoryNames.length,
          },
        },
        ...territoryEvents,
      ],
      {
        game_id: gameId,
        correlation_id: gameId,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error starting game:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
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
    // Validate inputs
    const validated = placeArmiesSchema.parse({
      gameId,
      playerId,
      territoryId,
      count,
    });

    // Server-side rate limiting (player-based)
    const rateLimitResult = await checkRateLimit({
      identifier: `place-armies:${playerId}`,
      ...SERVER_RATE_LIMITS.PLACE_ARMIES,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
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

    const supabase = createServerClient();

    // Get game state for phase context (with field selection for bandwidth optimization)
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('id, status, phase, current_player_order, winner_id, created_at').eq('id', gameId).single(),
      supabase.from('players').select('id, game_id, username, color, turn_order, armies_available, is_eliminated, created_at').eq('game_id', gameId).order('turn_order'),
      supabase.from('territories').select('id, game_id, territory_name, owner_id, army_count, updated_at').eq('game_id', gameId),
    ]);

    if (gameResult.error) throw gameResult.error;
    if (playersResult.error) throw playersResult.error;
    if (territoriesResult.error) throw territoriesResult.error;

    const game = gameResult.data as Game;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];
    const currentPlayer = players.find((p) => p.id === playerId);

    if (!currentPlayer) throw new Error('Player not found');

    // Build phase context
    const context: PhaseContext = {
      gameId,
      supabase,
      game,
      currentPlayer,
      players,
      territories,
    };

    // Use ReinforcementPhaseDelegate
    const delegate = getPhaseDelegate('reinforcement') as ReinforcementPhaseDelegate;
    const result = await delegate.placeArmies(
      context,
      playerId,
      territoryId,
      count
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Log event
    const eventStore = createEventStore(supabase);
    const eventType = game.status === 'setup' ? 'setup_army_placed' : 'army_placed';
    await eventStore.appendEvent(
      {
        event_type: eventType,
        payload: {
          territory_id: territoryId,
          army_count: count,
          phase: game.phase,
        },
      },
      {
        game_id: gameId,
        player_id: playerId,
      }
    );

    // Handle phase transition if requested
    if (result.transitionTo) {
      await transitionToPhase(context, result.transitionTo);
    }

    return { success: true };
  } catch (error) {
    console.error('Error placing armies:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
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
    // Validate inputs
    const validated = endTurnSchema.parse({ gameId, playerId });

    // Server-side rate limiting (player-based)
    const rateLimitResult = await checkRateLimit({
      identifier: `end-turn:${playerId}`,
      ...SERVER_RATE_LIMITS.END_TURN,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
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

    const supabase = createServerClient();

    // Get game and players (with field selection for bandwidth optimization)
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, phase, current_player_order, winner_id, created_at')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, game_id, username, color, turn_order, armies_available, is_eliminated, created_at')
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

    // Get territories for reinforcement calculation (with field selection)
    const { data: territories } = await supabase
      .from('territories')
      .select('id, game_id, territory_name, owner_id, army_count, updated_at')
      .eq('game_id', gameId);

    const reinforcements = calculateReinforcements(
      nextPlayer as Player,
      (territories as Territory[]) || []
    );

    // Execute turn end atomically via stored procedure
    const { data: txResult, error: txError } = await supabase.rpc(
      'end_turn_transaction',
      {
        p_game_id: gameId,
        p_player_id: playerId,
        p_next_player_order: nextPlayerOrder,
        p_reinforcements: reinforcements,
      }
    );

    if (txError) {
      throw new Error(`Transaction failed: ${txError.message}`);
    }

    // Log event
    const eventStore = createEventStore(supabase);
    await eventStore.appendEvent(
      {
        event_type: 'turn_ended',
        payload: {
          previous_player_id: playerId,
          next_player_id: nextPlayer.id,
          next_player_order: nextPlayerOrder,
          reinforcements: reinforcements,
        },
      },
      {
        game_id: gameId,
        player_id: playerId,
      }
    );

    // Auto-create snapshot if threshold met (every 50 events)
    await autoCreateSnapshot(supabase, gameId);

    return { success: true };
  } catch (error) {
    console.error('Error ending turn:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
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
    // Validate inputs
    const validated = changePhaseSchema.parse({ gameId, playerId, newPhase });

    // Server-side rate limiting (player-based)
    const rateLimitResult = await checkRateLimit({
      identifier: `change-phase:${playerId}`,
      ...SERVER_RATE_LIMITS.CHANGE_PHASE,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
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

    const supabase = createServerClient();

    // Get game state for phase context (with field selection for bandwidth optimization)
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('id, status, phase, current_player_order, winner_id, created_at').eq('id', gameId).single(),
      supabase.from('players').select('id, game_id, username, color, turn_order, armies_available, is_eliminated, created_at').eq('game_id', gameId).order('turn_order'),
      supabase.from('territories').select('id, game_id, territory_name, owner_id, army_count, updated_at').eq('game_id', gameId),
    ]);

    if (gameResult.error) throw gameResult.error;
    if (playersResult.error) throw playersResult.error;
    if (territoriesResult.error) throw territoriesResult.error;

    const game = gameResult.data as Game;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];

    const currentPlayer = players.find(
      (p) => p.turn_order === game.current_player_order
    );

    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    // Build phase context
    const context: PhaseContext = {
      gameId,
      supabase,
      game,
      currentPlayer,
      players,
      territories,
    };

    // Log event
    const eventStore = createEventStore(supabase);
    await eventStore.appendEvent(
      {
        event_type: 'phase_changed',
        payload: {
          from_phase: game.phase,
          to_phase: newPhase,
        },
      },
      {
        game_id: gameId,
        player_id: playerId,
      }
    );

    // Use phase manager for proper lifecycle management
    await transitionToPhase(context, newPhase);

    return { success: true };
  } catch (error) {
    console.error('Error changing phase:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
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
    // Validate inputs
    const validated = attackSchema.parse({
      gameId,
      playerId,
      fromTerritoryId,
      toTerritoryId,
    });

    // Server-side rate limiting (player-based)
    const rateLimitResult = await checkRateLimit({
      identifier: `attack:${playerId}`,
      ...SERVER_RATE_LIMITS.ATTACK,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
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

    const supabase = createServerClient();

    // Get game state for phase context (with field selection for bandwidth optimization)
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('id, status, phase, current_player_order, winner_id, created_at').eq('id', gameId).single(),
      supabase.from('players').select('id, game_id, username, color, turn_order, armies_available, is_eliminated, created_at').eq('game_id', gameId).order('turn_order'),
      supabase.from('territories').select('id, game_id, territory_name, owner_id, army_count, updated_at').eq('game_id', gameId),
    ]);

    if (gameResult.error) throw gameResult.error;
    if (playersResult.error) throw playersResult.error;
    if (territoriesResult.error) throw territoriesResult.error;

    const game = gameResult.data as Game;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];
    const currentPlayer = players.find((p) => p.id === playerId);

    if (!currentPlayer) throw new Error('Player not found');

    // Build phase context
    const context: PhaseContext = {
      gameId,
      supabase,
      game,
      currentPlayer,
      players,
      territories,
    };

    // Use AttackPhaseDelegate
    const delegate = getPhaseDelegate('attack') as AttackPhaseDelegate;
    const result = await delegate.attackTerritory(
      context,
      playerId,
      fromTerritoryId,
      toTerritoryId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Log event
    const eventStore = createEventStore(supabase);
    const correlationId = crypto.randomUUID();
    const attackResult = result.result as any;

    const events: Array<{
      event_type: GameEventType;
      payload: Record<string, any>;
    }> = [
      {
        event_type: 'territory_attacked',
        payload: {
          from_territory_id: fromTerritoryId,
          to_territory_id: toTerritoryId,
          attacker_losses: attackResult.attackerLosses,
          defender_losses: attackResult.defenderLosses,
          conquered: attackResult.conquered,
        },
      },
    ];

    // Add conquest event if territory was conquered
    if (attackResult.conquered) {
      events.push({
        event_type: 'territory_conquered',
        payload: {
          territory_id: toTerritoryId,
          new_owner_id: playerId,
          armies_moved: attackResult.armiesToMove || 0,
        },
      });
    }

    // Add game finished event if winner detected
    if (attackResult.gameFinished) {
      events.push({
        event_type: 'game_finished',
        payload: {
          winner_id: attackResult.winner,
        },
      });
    }

    await eventStore.appendEvents(events, {
      game_id: gameId,
      player_id: playerId,
      correlation_id: correlationId,
    });

    // Handle phase transition if requested
    if (result.transitionTo) {
      await transitionToPhase(context, result.transitionTo);
    }

    return { success: true, result: result.result };
  } catch (error) {
    console.error('Error attacking territory:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
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
    // Validate inputs
    const validated = fortifySchema.parse({
      gameId,
      playerId,
      fromTerritoryId,
      toTerritoryId,
      armyCount,
    });

    // Server-side rate limiting (player-based)
    const rateLimitResult = await checkRateLimit({
      identifier: `fortify:${playerId}`,
      ...SERVER_RATE_LIMITS.FORTIFY,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: getRateLimitError(rateLimitResult.resetTime),
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

    const supabase = createServerClient();

    // Get game state for phase context (with field selection for bandwidth optimization)
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('id, status, phase, current_player_order, winner_id, created_at').eq('id', gameId).single(),
      supabase.from('players').select('id, game_id, username, color, turn_order, armies_available, is_eliminated, created_at').eq('game_id', gameId).order('turn_order'),
      supabase.from('territories').select('id, game_id, territory_name, owner_id, army_count, updated_at').eq('game_id', gameId),
    ]);

    if (gameResult.error) throw gameResult.error;
    if (playersResult.error) throw playersResult.error;
    if (territoriesResult.error) throw territoriesResult.error;

    const game = gameResult.data as Game;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];
    const currentPlayer = players.find((p) => p.id === playerId);

    if (!currentPlayer) throw new Error('Player not found');

    // Build phase context
    const context: PhaseContext = {
      gameId,
      supabase,
      game,
      currentPlayer,
      players,
      territories,
    };

    // Use FortifyPhaseDelegate
    const delegate = getPhaseDelegate('fortify') as FortifyPhaseDelegate;
    const result = await delegate.fortifyTerritory(
      context,
      playerId,
      fromTerritoryId,
      toTerritoryId,
      armyCount
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Log event
    const eventStore = createEventStore(supabase);
    await eventStore.appendEvent(
      {
        event_type: 'army_fortified',
        payload: {
          from_territory_id: fromTerritoryId,
          to_territory_id: toTerritoryId,
          army_count: armyCount,
        },
      },
      {
        game_id: gameId,
        player_id: playerId,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error fortifying territory:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
