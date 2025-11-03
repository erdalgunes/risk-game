-- Risk Game Clone Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game statuses
CREATE TYPE game_status AS ENUM ('waiting', 'setup', 'playing', 'finished');

-- Game phases
CREATE TYPE game_phase AS ENUM ('reinforcement', 'attack', 'fortify');

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status game_status NOT NULL DEFAULT 'waiting',
  phase game_phase DEFAULT 'reinforcement',
  current_turn INTEGER NOT NULL DEFAULT 0,
  current_player_order INTEGER DEFAULT 0,
  winner_id UUID,
  max_players INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  color TEXT NOT NULL,
  turn_order INTEGER NOT NULL,
  armies_available INTEGER NOT NULL DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, turn_order),
  UNIQUE(game_id, color)
);

-- Territories table
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  territory_name TEXT NOT NULL,
  owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  army_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, territory_name)
);

-- Game actions log (for async play and history)
CREATE TABLE game_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_territories_game_id ON territories(game_id);
CREATE INDEX idx_territories_owner_id ON territories(owner_id);
CREATE INDEX idx_game_actions_game_id ON game_actions(game_id);
CREATE INDEX idx_games_status ON games(status);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE territories;
ALTER PUBLICATION supabase_realtime ADD TABLE game_actions;

-- Row Level Security (RLS) Policies
-- Everyone can read all game data (anonymous multiplayer)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;

-- Games: everyone can read and create
CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can create games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);

-- Players: everyone can read and insert
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can create players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON players FOR UPDATE USING (true);

-- Territories: everyone can read and modify
CREATE POLICY "Anyone can read territories" ON territories FOR SELECT USING (true);
CREATE POLICY "Anyone can create territories" ON territories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update territories" ON territories FOR UPDATE USING (true);

-- Game actions: everyone can read and create
CREATE POLICY "Anyone can read actions" ON game_actions FOR SELECT USING (true);
CREATE POLICY "Anyone can create actions" ON game_actions FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup stale games
-- Deletes games in 'waiting' status older than 24 hours
-- Deletes games in 'setup' status older than 6 hours
-- Uses ON DELETE CASCADE to automatically clean up related players, territories, and actions
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
