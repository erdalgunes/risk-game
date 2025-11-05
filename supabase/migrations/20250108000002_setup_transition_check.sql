-- Setup Phase Transition Check
-- Atomically checks if all players have placed all armies and transitions to playing phase
-- This prevents race conditions where multiple players could trigger transition simultaneously

CREATE OR REPLACE FUNCTION check_and_transition_from_setup(
  p_game_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_current_status game_status;
  v_all_armies_placed BOOLEAN;
  v_transitioned BOOLEAN := false;
BEGIN
  -- Get current game status
  SELECT status
  INTO v_current_status
  FROM games
  WHERE id = p_game_id
  FOR UPDATE; -- Lock the row to prevent concurrent transitions

  -- Only proceed if game is in setup phase
  IF v_current_status != 'setup' THEN
    RETURN jsonb_build_object(
      'success', true,
      'transitioned', false,
      'reason', 'Game is not in setup phase'
    );
  END IF;

  -- Check if all players have armies_available = 0
  SELECT NOT EXISTS (
    SELECT 1
    FROM players
    WHERE game_id = p_game_id AND armies_available > 0
  ) INTO v_all_armies_placed;

  -- If all armies are placed, transition to playing phase
  IF v_all_armies_placed THEN
    UPDATE games
    SET
      status = 'playing',
      phase = 'reinforcement'
    WHERE id = p_game_id;

    v_transitioned := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transitioned', v_transitioned,
    'new_status', CASE WHEN v_transitioned THEN 'playing' ELSE 'setup' END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
