/**
 * Rollback Migration: Undo Stored Procedure
 *
 * This migration rolls back the undo stored procedure introduced in 20250106000000.
 * Run this migration if you need to revert the atomic undo functionality.
 *
 * CAUTION: This will remove the apply_undo_state() function.
 * Make sure no code is depending on this function before running this migration.
 */

-- Drop the apply_undo_state stored procedure
DROP FUNCTION IF EXISTS apply_undo_state(
  p_game_id UUID,
  p_event_id UUID,
  p_game_state JSONB,
  p_players_state JSONB[],
  p_territories_state JSONB[]
);

-- Add a comment to track the rollback
COMMENT ON SCHEMA public IS 'Undo stored procedure rolled back at ' || NOW()::TEXT;
