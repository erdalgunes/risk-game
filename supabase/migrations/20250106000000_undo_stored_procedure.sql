-- Undo Stored Procedure
-- Atomically updates game state and deletes event when undoing an action
-- The replayed state is calculated by the application layer

CREATE OR REPLACE FUNCTION apply_undo_state(
  p_game_id UUID,
  p_event_id UUID,
  p_game_state jsonb,
  p_players_state jsonb,
  p_territories_state jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_record RECORD;
  v_territory_record RECORD;
  v_rows_affected INTEGER := 0;
BEGIN
  -- Start transaction (implicit in function)

  -- Update game state
  UPDATE games
  SET
    status = (p_game_state->>'status')::TEXT,
    phase = (p_game_state->>'phase')::TEXT,
    current_player_order = (p_game_state->>'current_player_order')::INTEGER,
    winner_id = (p_game_state->>'winner_id')::UUID
  WHERE id = p_game_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Game not found: %', p_game_id;
  END IF;

  -- Batch update players using jsonb data
  FOR v_player_record IN
    SELECT * FROM jsonb_to_recordset(p_players_state)
    AS players(
      id UUID,
      armies_available INTEGER,
      is_eliminated BOOLEAN
    )
  LOOP
    UPDATE players
    SET
      armies_available = v_player_record.armies_available,
      is_eliminated = v_player_record.is_eliminated
    WHERE id = v_player_record.id
      AND game_id = p_game_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Player not found: %', v_player_record.id;
    END IF;
  END LOOP;

  -- Batch update territories using jsonb data
  FOR v_territory_record IN
    SELECT * FROM jsonb_to_recordset(p_territories_state)
    AS territories(
      id UUID,
      owner_id UUID,
      army_count INTEGER
    )
  LOOP
    UPDATE territories
    SET
      owner_id = v_territory_record.owner_id,
      army_count = v_territory_record.army_count
    WHERE id = v_territory_record.id
      AND game_id = p_game_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Territory not found: %', v_territory_record.id;
    END IF;
  END LOOP;

  -- Delete the event being undone
  DELETE FROM game_events
  WHERE id = p_event_id
    AND game_id = p_game_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Undo applied successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically on exception
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION apply_undo_state(UUID, UUID, jsonb, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION apply_undo_state IS
'Atomically applies an undo operation by updating game state and deleting the event. All operations are in a single transaction.';
