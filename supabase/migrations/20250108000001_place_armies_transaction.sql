-- Place Armies Transaction
-- Atomically handles army placement:
-- 1. Add armies to territory
-- 2. Subtract armies from player's available armies
-- This prevents race conditions where territory or player could be updated separately

CREATE OR REPLACE FUNCTION place_armies_transaction(
  p_game_id UUID,
  p_player_id UUID,
  p_territory_id UUID,
  p_count INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_current_territory_armies INTEGER;
  v_current_player_armies INTEGER;
  v_game_status game_status;
BEGIN
  -- Verify player has enough armies available
  SELECT armies_available
  INTO v_current_player_armies
  FROM players
  WHERE id = p_player_id AND game_id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF v_current_player_armies < p_count THEN
    RAISE EXCEPTION 'Not enough armies available';
  END IF;

  -- Update territory armies (add)
  UPDATE territories
  SET army_count = army_count + p_count
  WHERE id = p_territory_id AND game_id = p_game_id
  RETURNING army_count INTO v_current_territory_armies;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Territory not found';
  END IF;

  -- Update player armies (subtract)
  UPDATE players
  SET armies_available = armies_available - p_count
  WHERE id = p_player_id AND game_id = p_game_id;

  -- Get current game status
  SELECT status
  INTO v_game_status
  FROM games
  WHERE id = p_game_id;

  -- Return success with updated values
  RETURN jsonb_build_object(
    'success', true,
    'territory_armies', v_current_territory_armies,
    'player_armies_remaining', v_current_player_armies - p_count,
    'game_status', v_game_status
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
