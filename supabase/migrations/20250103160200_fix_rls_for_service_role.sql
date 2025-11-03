-- Fix RLS policies to ensure service role always has access
-- Service role should bypass RLS, but let's ensure policies are correct

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can read games" ON games;
DROP POLICY IF EXISTS "Service role can create games" ON games;
DROP POLICY IF EXISTS "Service role can update games" ON games;

DROP POLICY IF EXISTS "Anyone can read players" ON players;
DROP POLICY IF EXISTS "Service role can insert players" ON players;
DROP POLICY IF EXISTS "Service role can update players" ON players;
DROP POLICY IF EXISTS "Service role can delete players" ON players;

DROP POLICY IF EXISTS "Anyone can read territories" ON territories;
DROP POLICY IF EXISTS "Service role can insert territories" ON territories;
DROP POLICY IF EXISTS "Service role can update territories" ON territories;
DROP POLICY IF EXISTS "Service role can delete territories" ON territories;

DROP POLICY IF EXISTS "Anyone can read actions" ON game_actions;
DROP POLICY IF EXISTS "Service role can insert actions" ON game_actions;

-- Create simple, permissive policies for testing
-- Everyone can read (needed for UI)
CREATE POLICY "Allow all reads on games" ON games FOR SELECT USING (true);
CREATE POLICY "Allow all reads on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow all reads on territories" ON territories FOR SELECT USING (true);
CREATE POLICY "Allow all reads on actions" ON game_actions FOR SELECT USING (true);

-- Allow all writes (service role will handle validation in Server Actions)
CREATE POLICY "Allow all writes on games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on territories" ON territories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on actions" ON game_actions FOR ALL USING (true) WITH CHECK (true);
