import type { Database, PlayerColor, SupabaseClient } from '@risk-poc/database';

type Lobby = Database['public']['Tables']['game_lobbies']['Row'];
type LobbyPlayer = Database['public']['Tables']['lobby_players']['Row'];

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

/**
 * Create a new lobby
 */
export async function createLobby(
  supabase: SupabaseClient,
  hostPlayerId: string,
  maxPlayers: number = 6
): Promise<Lobby> {
  // Generate lobby code using database function
  const { data: lobbyCodeData, error: codeError } = await supabase.rpc('generate_lobby_code');

  if (codeError || !lobbyCodeData) {
    throw new Error(`Failed to generate lobby code: ${codeError?.message || 'Unknown error'}`);
  }

  const lobbyCode = lobbyCodeData as string;

  // Create lobby
  const { data: lobby, error: lobbyError } = await supabase
    .from('game_lobbies')
    .insert({
      lobby_code: lobbyCode,
      host_player_id: hostPlayerId,
      max_players: maxPlayers,
      status: 'waiting'
    })
    .select()
    .single();

  if (lobbyError || !lobby) {
    throw new Error(`Failed to create lobby: ${lobbyError?.message || 'Unknown error'}`);
  }

  // Add host as first player
  await joinLobby(supabase, lobby.id, hostPlayerId);

  return lobby;
}

/**
 * Join an existing lobby by code
 */
export async function joinLobbyByCode(
  supabase: SupabaseClient,
  lobbyCode: string,
  playerId: string
): Promise<Lobby> {
  // Find lobby by code
  const { data: lobby, error: findError } = await supabase
    .from('game_lobbies')
    .select('*')
    .eq('lobby_code', lobbyCode.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (findError || !lobby) {
    throw new Error('Lobby not found or already started');
  }

  // Check if lobby is full
  const { count } = await supabase
    .from('lobby_players')
    .select('*', { count: 'exact', head: true })
    .eq('lobby_id', lobby.id);

  if (count !== null && count >= lobby.max_players) {
    throw new Error('Lobby is full');
  }

  // Join lobby
  await joinLobby(supabase, lobby.id, playerId);

  return lobby;
}

/**
 * Internal function to add a player to a lobby
 */
async function joinLobby(
  supabase: SupabaseClient,
  lobbyId: string,
  playerId: string
): Promise<void> {
  // Check if player already in lobby
  const { data: existing } = await supabase
    .from('lobby_players')
    .select('*')
    .eq('lobby_id', lobbyId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    // Already in lobby, just update heartbeat
    await updateHeartbeat(supabase, lobbyId, playerId);
    return;
  }

  // Get current player count to determine join order
  const { count } = await supabase
    .from('lobby_players')
    .select('*', { count: 'exact', head: true })
    .eq('lobby_id', lobbyId);

  const joinOrder = (count || 0) + 1;
  const playerColor = PLAYER_COLORS[count || 0]; // Assign color based on join order

  // Insert player into lobby
  const { error } = await supabase
    .from('lobby_players')
    .insert({
      lobby_id: lobbyId,
      player_id: playerId,
      player_color: playerColor,
      join_order: joinOrder
    });

  if (error) {
    throw new Error(`Failed to join lobby: ${error.message}`);
  }
}

/**
 * Leave a lobby
 */
export async function leaveLobby(
  supabase: SupabaseClient,
  lobbyId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('lobby_players')
    .delete()
    .eq('lobby_id', lobbyId)
    .eq('player_id', playerId);

  if (error) {
    throw new Error(`Failed to leave lobby: ${error.message}`);
  }

  // If this was the host, check if lobby should be deleted
  const { data: lobby } = await supabase
    .from('game_lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single();

  if (lobby && lobby.host_player_id === playerId) {
    // Host left, delete lobby
    await supabase
      .from('game_lobbies')
      .delete()
      .eq('id', lobbyId);
  }
}

/**
 * Get all players in a lobby
 */
export async function getLobbyPlayers(
  supabase: SupabaseClient,
  lobbyId: string
): Promise<Array<LobbyPlayer & { display_name: string }>> {
  const { data, error } = await supabase
    .from('lobby_players')
    .select(`
      *,
      players:player_id (display_name)
    `)
    .eq('lobby_id', lobbyId)
    .order('join_order');

  if (error) {
    throw new Error(`Failed to get lobby players: ${error.message}`);
  }

  // Transform the data to flatten the player info
  return (data || []).map((item: any) => ({
    ...item,
    display_name: item.players?.display_name || 'Unknown'
  }));
}

/**
 * Update player's last heartbeat
 */
export async function updateHeartbeat(
  supabase: SupabaseClient,
  lobbyId: string,
  playerId: string
): Promise<void> {
  await supabase
    .from('lobby_players')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('lobby_id', lobbyId)
    .eq('player_id', playerId);
}

/**
 * Start a game from a lobby
 */
export async function startGameFromLobby(
  supabase: SupabaseClient,
  lobbyId: string,
  hostPlayerId: string
): Promise<string> {
  // Verify caller is the host
  const { data: lobby } = await supabase
    .from('game_lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single();

  if (!lobby || lobby.host_player_id !== hostPlayerId) {
    throw new Error('Only the host can start the game');
  }

  if (lobby.status !== 'waiting') {
    throw new Error('Lobby is not in waiting status');
  }

  // Get all players in lobby
  const players = await getLobbyPlayers(supabase, lobbyId);

  if (players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }

  // Update lobby status to 'starting'
  await supabase
    .from('game_lobbies')
    .update({
      status: 'starting',
      started_at: new Date().toISOString()
    })
    .eq('id', lobbyId);

  // Return lobby ID (the game creation will be handled by the lobby page)
  return lobbyId;
}

/**
 * Kick a player from the lobby (host only)
 */
export async function kickPlayer(
  supabase: SupabaseClient,
  lobbyId: string,
  hostPlayerId: string,
  playerIdToKick: string
): Promise<void> {
  // Verify caller is the host
  const { data: lobby } = await supabase
    .from('game_lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single();

  if (!lobby || lobby.host_player_id !== hostPlayerId) {
    throw new Error('Only the host can kick players');
  }

  // Can't kick yourself
  if (hostPlayerId === playerIdToKick) {
    throw new Error('Host cannot kick themselves');
  }

  // Remove player from lobby
  await supabase
    .from('lobby_players')
    .delete()
    .eq('lobby_id', lobbyId)
    .eq('player_id', playerIdToKick);
}
