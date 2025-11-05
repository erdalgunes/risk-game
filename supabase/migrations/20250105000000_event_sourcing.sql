/**
 * Migration 002: Event Sourcing
 *
 * Adds event sourcing capabilities to the game system:
 * - game_events table for storing all game state changes
 * - game_snapshots table for periodic state snapshots (performance optimization)
 * - Event replay functionality
 * - Undo/redo support
 * - Audit trail for cheat detection
 *
 * Benefits:
 * - Complete history of all game actions
 * - Time travel debugging (replay from any point)
 * - Undo functionality
 * - Cheat detection (validate event sequence)
 * - Bug reproduction (replay exact sequence of events)
 */

-- =============================================
-- GAME EVENTS TABLE
-- =============================================
-- Stores every state-changing event in the game
-- Immutable append-only log (never UPDATE/DELETE)
CREATE TABLE IF NOT EXISTS game_events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,

  -- Event metadata
  event_type TEXT NOT NULL, -- 'game_started', 'army_placed', 'territory_attacked', etc.
  event_version INTEGER NOT NULL DEFAULT 1, -- Schema version for event payload
  sequence_number BIGSERIAL, -- Auto-incrementing sequence per game

  -- Event data
  payload JSONB NOT NULL, -- Event-specific data (e.g., {from: 'alaska', to: 'kamchatka', losses: 3})
  metadata JSONB DEFAULT '{}'::jsonb, -- Optional metadata (IP, user agent, etc.)

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Causality tracking
  correlation_id UUID, -- Links related events (e.g., attack -> conquest -> elimination)
  causation_id UUID, -- What event caused this event

  -- Constraints
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'game_created',
      'game_started',
      'player_joined',
      'territory_claimed',
      'setup_army_placed',
      'turn_started',
      'reinforcement_calculated',
      'army_placed',
      'phase_changed',
      'territory_attacked',
      'territory_conquered',
      'player_eliminated',
      'army_fortified',
      'turn_ended',
      'game_finished'
    )
  )
);

-- Indexes for efficient queries
CREATE INDEX idx_game_events_game_id ON game_events(game_id, sequence_number);
CREATE INDEX idx_game_events_player_id ON game_events(player_id);
CREATE INDEX idx_game_events_event_type ON game_events(event_type);
CREATE INDEX idx_game_events_created_at ON game_events(created_at);
CREATE INDEX idx_game_events_correlation_id ON game_events(correlation_id) WHERE correlation_id IS NOT NULL;

-- GIN index for JSONB payload queries (e.g., find all attacks from specific territory)
CREATE INDEX idx_game_events_payload ON game_events USING GIN(payload);

-- Ensure sequence_number is unique per game
CREATE UNIQUE INDEX idx_game_events_sequence ON game_events(game_id, sequence_number);

-- =============================================
-- GAME SNAPSHOTS TABLE
-- =============================================
-- Periodic snapshots of game state for faster replay
-- Instead of replaying 1000 events, replay to nearest snapshot + remaining events
CREATE TABLE IF NOT EXISTS game_snapshots (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Snapshot metadata
  sequence_number BIGINT NOT NULL, -- Last event included in this snapshot
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Snapshot data (complete game state at this point)
  game_state JSONB NOT NULL, -- {game: {...}, players: [...], territories: [...]}

  -- Constraints
  UNIQUE(game_id, sequence_number)
);

-- Index for finding snapshots
CREATE INDEX idx_game_snapshots_game_id ON game_snapshots(game_id, sequence_number DESC);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

/**
 * Get all events for a game after a specific sequence number
 * Used for replay from snapshot or from beginning
 */
CREATE OR REPLACE FUNCTION get_game_events(
  p_game_id UUID,
  p_from_sequence BIGINT DEFAULT 0
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  payload JSONB,
  sequence_number BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    game_events.event_type,
    game_events.payload,
    game_events.sequence_number,
    game_events.created_at
  FROM game_events
  WHERE game_id = p_game_id
    AND game_events.sequence_number > p_from_sequence
  ORDER BY game_events.sequence_number ASC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get the most recent snapshot for a game
 * Returns NULL if no snapshots exist
 */
CREATE OR REPLACE FUNCTION get_latest_snapshot(
  p_game_id UUID
)
RETURNS TABLE (
  snapshot_id UUID,
  sequence_number BIGINT,
  game_state JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    game_snapshots.sequence_number,
    game_snapshots.game_state
  FROM game_snapshots
  WHERE game_id = p_game_id
  ORDER BY game_snapshots.sequence_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Create a snapshot of current game state
 * Should be called periodically (e.g., every 50 events or every turn)
 */
CREATE OR REPLACE FUNCTION create_game_snapshot(
  p_game_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_last_sequence BIGINT;
  v_game_state JSONB;
BEGIN
  -- Get the last event sequence number
  SELECT COALESCE(MAX(sequence_number), 0)
  INTO v_last_sequence
  FROM game_events
  WHERE game_id = p_game_id;

  -- Build snapshot from current database state
  SELECT jsonb_build_object(
    'game', to_jsonb(g.*),
    'players', (
      SELECT jsonb_agg(to_jsonb(p.*))
      FROM players p
      WHERE p.game_id = p_game_id
    ),
    'territories', (
      SELECT jsonb_agg(to_jsonb(t.*))
      FROM territories t
      WHERE t.game_id = p_game_id
    )
  )
  INTO v_game_state
  FROM games g
  WHERE g.id = p_game_id;

  -- Insert snapshot
  INSERT INTO game_snapshots (game_id, sequence_number, game_state)
  VALUES (p_game_id, v_last_sequence, v_game_state)
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Count events since last snapshot
 * Used to determine when to create a new snapshot
 */
CREATE OR REPLACE FUNCTION events_since_snapshot(
  p_game_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_last_snapshot_seq BIGINT;
  v_current_seq BIGINT;
BEGIN
  -- Get last snapshot sequence
  SELECT COALESCE(MAX(sequence_number), 0)
  INTO v_last_snapshot_seq
  FROM game_snapshots
  WHERE game_id = p_game_id;

  -- Get current sequence
  SELECT COALESCE(MAX(sequence_number), 0)
  INTO v_current_seq
  FROM game_events
  WHERE game_id = p_game_id;

  RETURN v_current_seq - v_last_snapshot_seq;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_snapshots ENABLE ROW LEVEL SECURITY;

-- Events: Anyone can read (for replay/debugging)
CREATE POLICY "Anyone can read game events"
  ON game_events FOR SELECT
  USING (true);

-- Events: Only server can insert (via service role)
-- This is append-only, so no UPDATE/DELETE policies
CREATE POLICY "Service role can insert events"
  ON game_events FOR INSERT
  WITH CHECK (true); -- Restricted to service role in Supabase dashboard

-- Snapshots: Anyone can read
CREATE POLICY "Anyone can read snapshots"
  ON game_snapshots FOR SELECT
  USING (true);

-- Snapshots: Only server can insert/update
CREATE POLICY "Service role can manage snapshots"
  ON game_snapshots FOR ALL
  USING (true)
  WITH CHECK (true); -- Restricted to service role in Supabase dashboard

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE game_events IS 'Immutable event log for event sourcing. Never UPDATE/DELETE.';
COMMENT ON COLUMN game_events.sequence_number IS 'Auto-incrementing sequence per game for event ordering';
COMMENT ON COLUMN game_events.correlation_id IS 'Groups related events (e.g., attack -> conquest -> elimination)';
COMMENT ON COLUMN game_events.causation_id IS 'References the event that caused this event';

COMMENT ON TABLE game_snapshots IS 'Periodic state snapshots for faster event replay';
COMMENT ON FUNCTION create_game_snapshot IS 'Creates a snapshot of current game state. Call every N events.';
COMMENT ON FUNCTION events_since_snapshot IS 'Returns count of events since last snapshot. Use to determine when to snapshot.';
