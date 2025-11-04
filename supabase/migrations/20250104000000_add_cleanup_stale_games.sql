CREATE OR REPLACE FUNCTION cleanup_stale_games()
RETURNS TABLE (deleted_count INTEGER) AS $$
DECLARE
  count_deleted INTEGER;
BEGIN
  -- Delete stale games
  WITH deleted AS (
    DELETE FROM games
    WHERE
      (status = 'waiting' AND created_at < NOW() - INTERVAL '24 hours')
      OR (status = 'setup' AND updated_at < NOW() - INTERVAL '6 hours')
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO count_deleted FROM deleted;

  RETURN QUERY SELECT count_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
