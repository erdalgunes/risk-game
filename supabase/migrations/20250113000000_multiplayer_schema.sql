-- Migration: Add multiplayer support with players, lobbies, and game_players
-- Created: 2025-01-13

-- ============================================================================
-- ENUMS: Define status types
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE lobby_status AS ENUM ('waiting', 'starting', 'in_progress', 'finished');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE game_status AS ENUM ('active', 'finished', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PLAYERS TABLE: Anonymous player sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_last_active ON players(last_active DESC);

-- ============================================================================
-- GAME LOBBIES TABLE: Pre-game player gathering
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_code TEXT UNIQUE NOT NULL,
  host_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  max_players INTEGER NOT NULL CHECK (max_players >= 2 AND max_players <= 6),
  status lobby_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_lobbies_code ON game_lobbies(lobby_code);
CREATE INDEX idx_lobbies_status ON game_lobbies(status);
CREATE INDEX idx_lobbies_created_at ON game_lobbies(created_at DESC);

-- ============================================================================
-- LOBBY PLAYERS: Players in a lobby (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lobby_players (
  lobby_id UUID NOT NULL REFERENCES game_lobbies(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_color TEXT CHECK (player_color IN ('red', 'blue', 'yellow', 'green', 'purple', 'orange')),
  join_order INTEGER NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lobby_id, player_id)
);

CREATE INDEX idx_lobby_players_lobby ON lobby_players(lobby_id);
CREATE INDEX idx_lobby_players_player ON lobby_players(player_id);
CREATE INDEX idx_lobby_players_heartbeat ON lobby_players(last_heartbeat);

-- ============================================================================
-- UPDATE GAMES TABLE: Add lobby and player tracking
-- ============================================================================
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS lobby_id UUID REFERENCES game_lobbies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player_count INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS status game_status DEFAULT 'active';

CREATE INDEX idx_games_lobby ON games(lobby_id);
CREATE INDEX idx_games_status ON games(status);

-- ============================================================================
-- GAME PLAYERS: Track which player controls which color
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_players (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_color TEXT NOT NULL CHECK (player_color IN ('red', 'blue', 'yellow', 'green', 'purple', 'orange', 'neutral')),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_move_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, player_color)
);

CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id);

-- ============================================================================
-- REALTIME: Enable for new tables
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE lobby_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Update player last_active on any modification
CREATE TRIGGER update_players_last_active
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: Reusing existing update_updated_at_column function for consistency

-- ============================================================================
-- FUNCTIONS: Helper functions for game management
-- ============================================================================

-- Generate random 6-character lobby code
CREATE OR REPLACE FUNCTION generate_lobby_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (0,O,1,I)
  code_length CONSTANT INTEGER := 6;
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..code_length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old abandoned lobbies (older than 30 minutes in 'waiting' status)
CREATE OR REPLACE FUNCTION cleanup_abandoned_lobbies()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM game_lobbies
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old finished games (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE games
  SET status = 'abandoned'
  WHERE status = 'active'
    AND updated_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Remove inactive players from lobbies (no heartbeat for 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_inactive_lobby_players()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM lobby_players
  WHERE last_heartbeat < NOW() - INTERVAL '30 seconds'
    AND lobby_id IN (
      SELECT id FROM game_lobbies WHERE status = 'waiting'
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS): Basic protection
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Players: Anyone can read all players, can update their own
CREATE POLICY "Anyone can read players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create players"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own data"
  ON players FOR UPDATE
  USING (true); -- For PoC, allow all updates (we'll validate player_id client-side)

-- Game Lobbies: Anyone can read and create
CREATE POLICY "Anyone can read lobbies"
  ON game_lobbies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create lobbies"
  ON game_lobbies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Host can update lobbies"
  ON game_lobbies FOR UPDATE
  USING (true); -- For PoC, allow all updates

CREATE POLICY "Host can delete lobbies"
  ON game_lobbies FOR DELETE
  USING (true); -- For PoC, allow all deletes

-- Lobby Players: Anyone can read and join
CREATE POLICY "Anyone can read lobby players"
  ON lobby_players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join lobbies"
  ON lobby_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their lobby status"
  ON lobby_players FOR UPDATE
  USING (true);

CREATE POLICY "Players can leave lobbies"
  ON lobby_players FOR DELETE
  USING (true);

-- Games: Anyone can read and create (for PoC)
CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update games"
  ON games FOR UPDATE
  USING (true); -- Will be restricted by Edge Function validation

CREATE POLICY "Anyone can delete games"
  ON games FOR DELETE
  USING (true);

-- Game Players: Anyone can read
CREATE POLICY "Anyone can read game players"
  ON game_players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game players"
  ON game_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update game player status"
  ON game_players FOR UPDATE
  USING (true);

-- ============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- ============================================================================

-- Create a test player
-- INSERT INTO players (display_name) VALUES ('Test Player');

COMMENT ON TABLE players IS 'Anonymous player sessions with display names';
COMMENT ON TABLE game_lobbies IS 'Pre-game lobbies where players gather before starting';
COMMENT ON TABLE lobby_players IS 'Players currently in a lobby';
COMMENT ON TABLE game_players IS 'Maps players to their colors in active games';
COMMENT ON FUNCTION generate_lobby_code() IS 'Generates random 6-character lobby codes';
COMMENT ON FUNCTION cleanup_abandoned_lobbies() IS 'Removes lobbies older than 30 minutes';
COMMENT ON FUNCTION cleanup_old_games() IS 'Marks games older than 24 hours as abandoned';
COMMENT ON FUNCTION cleanup_inactive_lobby_players() IS 'Removes players with no heartbeat for 30s';
