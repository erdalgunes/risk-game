/**
 * Snapshot Helpers
 *
 * Utilities for automatic snapshot creation in game actions.
 * Snapshots improve replay performance by caching state periodically.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createEventStore } from './EventStore';

/**
 * Default snapshot threshold (create snapshot every N events)
 */
const DEFAULT_SNAPSHOT_THRESHOLD = 50;

/**
 * Check and create snapshot if threshold is met
 *
 * This should be called after significant game actions (e.g., end turn, attack, fortify)
 * to automatically maintain snapshots for performance.
 *
 * @param supabase Supabase client
 * @param game_id Game ID
 * @param threshold Number of events before snapshot (default: 50)
 * @returns True if snapshot was created, false otherwise
 */
export async function autoCreateSnapshot(
  supabase: SupabaseClient,
  game_id: string,
  threshold: number = DEFAULT_SNAPSHOT_THRESHOLD
): Promise<boolean> {
  try {
    const eventStore = createEventStore(supabase);

    // Check if snapshot should be created
    const shouldCreate = await eventStore.shouldCreateSnapshot(game_id, threshold);

    if (shouldCreate) {
      // Create snapshot
      await eventStore.createSnapshot(game_id);
      return true;
    }

    return false;
  } catch (error) {
    // Log error but don't fail the action - snapshots are optional optimization
    console.error('Failed to auto-create snapshot:', error);
    return false;
  }
}

/**
 * Force create a snapshot regardless of threshold
 *
 * Useful for:
 * - Game start (baseline state)
 * - Game end (final state for history)
 * - After major events (player elimination, territory sweep)
 *
 * @param supabase Supabase client
 * @param game_id Game ID
 * @returns Snapshot ID or null if failed
 */
export async function forceCreateSnapshot(
  supabase: SupabaseClient,
  game_id: string
): Promise<string | null> {
  try {
    const eventStore = createEventStore(supabase);
    const snapshotId = await eventStore.createSnapshot(game_id);
    return snapshotId;
  } catch (error) {
    console.error('Failed to force create snapshot:', error);
    return null;
  }
}
