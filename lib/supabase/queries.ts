import { supabase } from './client';
import type { Game, Player, Territory, GameAction } from '@/types/game';
import { usernameSchema, maxPlayersSchema, gameIdSchema } from '@/lib/validation/schemas';
import { monitorQuery } from '@/lib/monitoring/performance';

/**
 * Fetch a game with all related data
 */
export async function getGameState(gameId: string) {
  return monitorQuery('getGameState', 'games', async () => {
    const [gameResult, playersResult, territoriesResult] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('players').select('*').eq('game_id', gameId).order('turn_order'),
      supabase.from('territories').select('*').eq('game_id', gameId),
    ]);

    if (gameResult.error) throw gameResult.error;
    if (playersResult.error) throw playersResult.error;
    if (territoriesResult.error) throw territoriesResult.error;

    const game = gameResult.data as Game;
    const players = playersResult.data as Player[];
    const territories = territoriesResult.data as Territory[];

    const currentPlayer =
      players.find((p) => p.turn_order === game.current_player_order) || null;

    return {
      game,
      players,
      territories,
      currentPlayer,
    };
  });
}

/**
 * Create a new game
 */
export async function createGame(maxPlayers: number = 4) {
  // Validate input
  const validatedMaxPlayers = maxPlayersSchema.parse(maxPlayers);

  const { data, error } = await supabase
    .from('games')
    .insert({
      max_players: validatedMaxPlayers,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Game;
}

/**
 * Join a game as a player
 */
export async function joinGame(
  gameId: string,
  username: string,
  color: string
) {
  // Validate inputs
  const validatedGameId = gameIdSchema.parse(gameId);
  const validatedUsername = usernameSchema.parse(username);

  // Get current player count
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', validatedGameId);

  const turnOrder = count || 0;

  const { data, error } = await supabase
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

  if (error) throw error;
  return data as Player;
}

/**
 * Update territory ownership and armies
 */
export async function updateTerritory(
  territoryId: string,
  updates: { owner_id?: string; army_count?: number }
) {
  const { data, error } = await supabase
    .from('territories')
    .update(updates)
    .eq('id', territoryId)
    .select()
    .single();

  if (error) throw error;
  return data as Territory;
}

/**
 * Update game state
 */
export async function updateGame(
  gameId: string,
  updates: Partial<Game>
) {
  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw error;
  return data as Game;
}

/**
 * Update player data
 */
export async function updatePlayer(
  playerId: string,
  updates: Partial<Player>
) {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId)
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

/**
 * Log a game action
 */
export async function logGameAction(
  gameId: string,
  playerId: string,
  actionType: string,
  payload: Record<string, any>
) {
  const { data, error } = await supabase
    .from('game_actions')
    .insert({
      game_id: gameId,
      player_id: playerId,
      action_type: actionType,
      payload,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GameAction;
}

/**
 * Get available games to join
 * Only shows games created in the last 24 hours to avoid stale games
 */
export async function getAvailableGames() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('games')
    .select('*, players(*)')
    .in('status', ['waiting', 'setup'])
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
