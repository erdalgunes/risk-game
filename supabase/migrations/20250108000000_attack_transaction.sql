-- Attack Territory Transaction
-- Atomically handles all operations for an attack:
-- 1. Update attacker territory armies (subtract losses)
-- 2. Update defender territory armies (subtract losses)
-- 3. Transfer territory ownership if conquered
-- 4. Move armies if conquered
-- 5. Check if defender is eliminated
-- 6. Check if attacker wins the game

CREATE OR REPLACE FUNCTION attack_territory_transaction(
  p_game_id UUID,
  p_player_id UUID,
  p_from_territory_id UUID,
  p_to_territory_id UUID,
  p_attacker_losses INTEGER,
  p_defender_losses INTEGER,
  p_conquered BOOLEAN,
  p_armies_to_move INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_defender_id UUID;
  v_defender_territory_count INTEGER;
  v_remaining_players INTEGER;
BEGIN
  -- Start transaction block

  -- Update attacker territory (subtract losses)
  UPDATE territories
  SET army_count = army_count - p_attacker_losses
  WHERE id = p_from_territory_id AND game_id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attacker territory not found';
  END IF;

  -- Update defender territory (subtract losses)
  UPDATE territories
  SET army_count = army_count - p_defender_losses
  WHERE id = p_to_territory_id AND game_id = p_game_id
  RETURNING owner_id INTO v_defender_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Defender territory not found';
  END IF;

  -- If conquered, transfer ownership and move armies
  IF p_conquered THEN
    -- Transfer ownership and set new army count
    UPDATE territories
    SET
      owner_id = p_player_id,
      army_count = p_armies_to_move
    WHERE id = p_to_territory_id AND game_id = p_game_id;

    -- Remove armies from attacker's territory
    UPDATE territories
    SET army_count = army_count - p_armies_to_move
    WHERE id = p_from_territory_id AND game_id = p_game_id;

    -- Check if defender is eliminated (has no territories left)
    SELECT COUNT(*)
    INTO v_defender_territory_count
    FROM territories
    WHERE game_id = p_game_id AND owner_id = v_defender_id;

    IF v_defender_territory_count = 0 THEN
      -- Mark defender as eliminated
      UPDATE players
      SET is_eliminated = TRUE
      WHERE id = v_defender_id AND game_id = p_game_id;

      -- Check if attacker won (only 1 active player left)
      SELECT COUNT(*)
      INTO v_remaining_players
      FROM players
      WHERE game_id = p_game_id AND is_eliminated = FALSE;

      IF v_remaining_players = 1 THEN
        -- Attacker wins!
        UPDATE games
        SET
          status = 'finished',
          winner_id = p_player_id
        WHERE id = p_game_id;
      END IF;
    END IF;
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'conquered', p_conquered,
    'defender_eliminated', (v_defender_territory_count = 0),
    'game_finished', (v_remaining_players = 1)
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
