-- Simplified Risk PoC Database Schema
-- Single table to store game state as JSON

-- Create game_states table
CREATE TABLE IF NOT EXISTS game_states (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime
ALTER TABLE game_states REPLICA IDENTITY FULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS game_states_updated_at_idx ON game_states(updated_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_states_updated_at
  BEFORE UPDATE ON game_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional for PoC, but good practice)
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (in production, you'd want more restrictive policies)
CREATE POLICY "Allow all operations on game_states" ON game_states
  FOR ALL
  USING (true)
  WITH CHECK (true);
