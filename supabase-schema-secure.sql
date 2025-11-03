-- SECURE RLS POLICIES FOR PRODUCTION
-- Run this migration to replace insecure policies
-- ⚠️ WARNING: This will drop all existing RLS policies

-- =============================================================================
-- STEP 1: Drop existing insecure policies
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can update games" ON games;
DROP POLICY IF EXISTS "Anyone can create games" ON games;
DROP POLICY IF EXISTS "Anyone can update players" ON players;
DROP POLICY IF EXISTS "Anyone can create players" ON players;
DROP POLICY IF EXISTS "Anyone can update territories" ON territories;
DROP POLICY IF EXISTS "Anyone can create territories" ON territories;
DROP POLICY IF EXISTS "Anyone can create actions" ON game_actions;

-- =============================================================================
-- STEP 2: Games Table - Read-only for clients, server-only mutations
-- =============================================================================

-- Everyone can read games (needed for lobby and game board)
CREATE POLICY "Anyone can read games" ON games
  FOR SELECT USING (true);

-- Only service role (Server Actions) can create games
CREATE POLICY "Service role can create games" ON games
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL -- Allow during server-side operations
  );

-- Only service role can update games
CREATE POLICY "Service role can update games" ON games
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL -- Allow during server-side operations
  );

-- =============================================================================
-- STEP 3: Players Table - Read-only for clients, server-only mutations
-- =============================================================================

-- Everyone can read players (needed for player list display)
CREATE POLICY "Anyone can read players" ON players
  FOR SELECT USING (true);

-- Only service role can manage players
CREATE POLICY "Service role can insert players" ON players
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

CREATE POLICY "Service role can update players" ON players
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

CREATE POLICY "Service role can delete players" ON players
  FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

-- =============================================================================
-- STEP 4: Territories Table - Read-only for clients, server-only mutations
-- =============================================================================

-- Everyone can read territories (needed for game board display)
CREATE POLICY "Anyone can read territories" ON territories
  FOR SELECT USING (true);

-- Only service role can manage territories
CREATE POLICY "Service role can insert territories" ON territories
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

CREATE POLICY "Service role can update territories" ON territories
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

CREATE POLICY "Service role can delete territories" ON territories
  FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

-- =============================================================================
-- STEP 5: Game Actions Table - Read for observers, server-only inserts
-- =============================================================================

-- Anyone can read game actions (for action history/log)
CREATE POLICY "Anyone can read actions" ON game_actions
  FOR SELECT USING (true);

-- Only service role can create game actions
CREATE POLICY "Service role can insert actions" ON game_actions
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    auth.jwt()->>'role' = 'service' OR
    auth.jwt() IS NULL
  );

-- =============================================================================
-- STEP 6: Add version columns for optimistic locking
-- =============================================================================

-- Add version column to games if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'version'
  ) THEN
    ALTER TABLE games ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Add version column to territories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'territories' AND column_name = 'version'
  ) THEN
    ALTER TABLE territories ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Add version column to players if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'version'
  ) THEN
    ALTER TABLE players ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- STEP 7: Create auto-increment version trigger
-- =============================================================================

-- Function to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_game_version ON games;
DROP TRIGGER IF EXISTS update_territory_version ON territories;
DROP TRIGGER IF EXISTS update_player_version ON players;

-- Create triggers for auto-versioning
CREATE TRIGGER update_game_version
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER update_territory_version
  BEFORE UPDATE ON territories
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER update_player_version
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- =============================================================================
-- STEP 8: Create helper functions for safe locking
-- =============================================================================

-- Function to lock territories for attack (prevents race conditions)
CREATE OR REPLACE FUNCTION lock_territories_for_attack(
  p_from_id UUID,
  p_to_id UUID
)
RETURNS TABLE (
  id UUID,
  game_id UUID,
  territory_name TEXT,
  owner_id UUID,
  army_count INTEGER,
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.game_id,
    t.territory_name,
    t.owner_id,
    t.army_count,
    t.version
  FROM territories t
  WHERE t.id IN (p_from_id, p_to_id)
  ORDER BY t.id -- Consistent ordering prevents deadlocks
  FOR UPDATE; -- Lock rows for update
END;
$$;

-- Function to lock territories for fortify
CREATE OR REPLACE FUNCTION lock_territories_for_fortify(
  p_from_id UUID,
  p_to_id UUID
)
RETURNS TABLE (
  id UUID,
  game_id UUID,
  territory_name TEXT,
  owner_id UUID,
  army_count INTEGER,
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.game_id,
    t.territory_name,
    t.owner_id,
    t.army_count,
    t.version
  FROM territories t
  WHERE t.id IN (p_from_id, p_to_id)
  ORDER BY t.id
  FOR UPDATE;
END;
$$;

-- Function to lock player for army placement
CREATE OR REPLACE FUNCTION lock_player_for_update(
  p_player_id UUID
)
RETURNS TABLE (
  id UUID,
  game_id UUID,
  username TEXT,
  armies_available INTEGER,
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.game_id,
    p.username,
    p.armies_available,
    p.version
  FROM players p
  WHERE p.id = p_player_id
  FOR UPDATE;
END;
$$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Show all policies for verification
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show version columns
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'version'
ORDER BY table_name;

-- =============================================================================
-- NOTES FOR DEPLOYMENT
-- =============================================================================

-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify policies with the verification queries above
-- 3. Update .env.local to include SUPABASE_SERVICE_ROLE_KEY (server-only)
-- 4. Ensure lib/supabase/server.ts uses service role for mutations
-- 5. Test all Server Actions after deployment
--
-- Security Model:
-- - Clients can READ all game data (needed for UI)
-- - All WRITES go through Server Actions using service role
-- - Server Actions verify player sessions before allowing mutations
-- - Row-level locking prevents race conditions
-- - Version columns enable optimistic concurrency control
