'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Player Session Management
 *
 * Provides secure HTTP-only cookie-based session management for anonymous multiplayer.
 * Each player gets a session tied to their game and player ID, preventing impersonation.
 */

const SESSION_PREFIX = 'player_session_';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Create a secure player session after joining a game
 */
export async function createPlayerSession(gameId: string, playerId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(`${SESSION_PREFIX}${gameId}`, playerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Get the player ID from the session for a given game
 * Returns null if no session exists
 */
export async function getPlayerSession(gameId: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(`${SESSION_PREFIX}${gameId}`);
    return session?.value || null;
  } catch (error) {
    console.error('Error getting player session:', error);
    return null;
  }
}

/**
 * Verify that the provided player ID matches the session
 * Critical for preventing player impersonation attacks
 */
export async function verifyPlayerSession(gameId: string, playerId: string): Promise<boolean> {
  const sessionPlayerId = await getPlayerSession(gameId);

  if (!sessionPlayerId || sessionPlayerId !== playerId) {
    return false;
  }

  // Additional verification: check that player exists in database
  try {
    const supabase = createServerClient();
    const { data: player, error } = await supabase
      .from('players')
      .select('id, game_id, is_eliminated')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (error || !player) {
      return false;
    }

    // Optional: Could also check if player is eliminated
    // For now, we allow eliminated players to observe
    return true;
  } catch (error) {
    console.error('Error verifying player session:', error);
    return false;
  }
}

/**
 * Clear player session (e.g., when leaving game)
 */
export async function clearPlayerSession(gameId: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(`${SESSION_PREFIX}${gameId}`);
  } catch (error) {
    console.error('Error clearing player session:', error);
  }
}

/**
 * Get all active player sessions (for debugging/admin purposes)
 * Returns map of gameId -> playerId
 */
export async function getAllPlayerSessions(): Promise<Map<string, string>> {
  const sessions = new Map<string, string>();

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
      if (cookie.name.startsWith(SESSION_PREFIX)) {
        const gameId = cookie.name.substring(SESSION_PREFIX.length);
        sessions.set(gameId, cookie.value);
      }
    }
  } catch (error) {
    console.error('Error getting all player sessions:', error);
  }

  return sessions;
}

/**
 * Refresh session expiration (call when player is active in game)
 */
export async function refreshPlayerSession(gameId: string): Promise<boolean> {
  const playerId = await getPlayerSession(gameId);

  if (!playerId) {
    return false;
  }

  // Re-create session to refresh expiration
  await createPlayerSession(gameId, playerId);
  return true;
}
