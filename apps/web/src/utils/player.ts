import type { Database, SupabaseClient } from '@risk-poc/database';

type Player = Database['public']['Tables']['players']['Row'];

const PLAYER_ID_KEY = 'risk_player_id';
const PLAYER_NAME_KEY = 'risk_player_name';

const adjectives = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Noble', 'Cunning', 'Bold', 'Fierce',
  'Wise', 'Royal', 'Grand', 'Elite', 'Prime', 'Ace', 'Epic', 'Pro'
];

const nouns = [
  'Tiger', 'Eagle', 'Lion', 'Wolf', 'Bear', 'Hawk', 'Falcon', 'Dragon',
  'Knight', 'General', 'Commander', 'Captain', 'Admiral', 'Marshal', 'Warrior', 'Champion'
];

/**
 * Generate a random display name like "SwiftTiger" or "BraveEagle"
 */
function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

/**
 * Get the current player from localStorage, or null if none exists
 */
export function getStoredPlayer(): { id: string; displayName: string } | null {
  if (typeof globalThis.window === 'undefined') return null;

  const playerId = localStorage.getItem(PLAYER_ID_KEY);
  const playerName = localStorage.getItem(PLAYER_NAME_KEY);

  if (playerId && playerName) {
    return { id: playerId, displayName: playerName };
  }

  return null;
}

/**
 * Store player info in localStorage
 */
function storePlayer(id: string, displayName: string): void {
  localStorage.setItem(PLAYER_ID_KEY, id);
  localStorage.setItem(PLAYER_NAME_KEY, displayName);
}

/**
 * Create or retrieve an anonymous player
 * @param supabase Supabase client
 * @param customName Optional custom display name
 * @returns Player object
 */
export async function ensurePlayer(
  supabase: SupabaseClient,
  customName?: string
): Promise<Player> {
  const stored = getStoredPlayer();

  // If we have a stored player, try to fetch it from database
  if (stored) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', stored.id)
      .single();

    if (data && !error) {
      // Update last_active timestamp
      await (supabase as any)
        .from('players')
        .update({ last_active: new Date().toISOString() })
        .eq('id', stored.id);

      return data;
    }
  }

  // Create new player
  const displayName = customName || stored?.displayName || generateRandomName();

  const { data, error } = await supabase
    .from('players')
    .insert({ display_name: displayName } as any)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create player: ${error?.message || 'Unknown error'}`);
  }

  const typedData = data as Player;

  // Store in localStorage
  storePlayer(typedData.id, typedData.display_name);

  return typedData;
}

/**
 * Update player's display name
 */
export async function updatePlayerName(
  supabase: SupabaseClient,
  playerId: string,
  newName: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from('players')
    .update({ display_name: newName })
    .eq('id', playerId);

  if (error) {
    throw new Error(`Failed to update player name: ${error.message}`);
  }

  // Update localStorage
  localStorage.setItem(PLAYER_NAME_KEY, newName);
}

/**
 * Clear stored player (for testing or logout)
 */
export function clearStoredPlayer(): void {
  if (typeof globalThis.window === 'undefined') return;
  localStorage.removeItem(PLAYER_ID_KEY);
  localStorage.removeItem(PLAYER_NAME_KEY);
}
