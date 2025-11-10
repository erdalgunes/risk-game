-- Add tutorial mode support to Risk game
-- Migration: 20250104_add_tutorial_mode

-- Add tutorial columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_tutorial BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT 0;

-- Add AI player flag to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;

-- Create index for tutorial games (performance)
CREATE INDEX IF NOT EXISTS idx_games_is_tutorial ON games(is_tutorial);

-- Create index for AI players (performance)
CREATE INDEX IF NOT EXISTS idx_players_is_ai ON players(is_ai);

-- Comment for documentation
COMMENT ON COLUMN games.is_tutorial IS 'Indicates if this is a tutorial game (single-player vs AI)';
COMMENT ON COLUMN games.tutorial_step IS 'Current tutorial step (0-4), only used for tutorial games';
COMMENT ON COLUMN players.is_ai IS 'Indicates if this player is controlled by AI (tutorial opponent)';
