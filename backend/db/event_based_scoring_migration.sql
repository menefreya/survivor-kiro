-- Event-Based Scoring System Migration
-- This migration adds tables and columns for the event-based scoring feature
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. Verify with: node backend/db/test_event_scoring_migration.js

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Event Types table - stores predefined scoring events
CREATE TABLE IF NOT EXISTS event_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('basic', 'penalty', 'bonus')),
  point_value INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contestant Events table - records events that occurred for contestants
CREATE TABLE IF NOT EXISTS contestant_events (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  point_value INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES players(id)
);

-- Sole Survivor History table - tracks sole survivor selection changes
CREATE TABLE IF NOT EXISTS sole_survivor_history (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  start_episode INTEGER NOT NULL,
  end_episode INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Add columns to episodes table
ALTER TABLE episodes 
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS aired_date DATE;

-- Add columns to contestants table
ALTER TABLE contestants 
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;

-- Add columns to episode_scores table
ALTER TABLE episode_scores 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'events')),
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Indexes for contestant_events table
CREATE INDEX IF NOT EXISTS idx_contestant_events_episode ON contestant_events(episode_id);
CREATE INDEX IF NOT EXISTS idx_contestant_events_contestant ON contestant_events(contestant_id);
CREATE INDEX IF NOT EXISTS idx_contestant_events_type ON contestant_events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_contestant_events_created_by ON contestant_events(created_by);

-- Indexes for sole_survivor_history table
CREATE INDEX IF NOT EXISTS idx_sole_survivor_player ON sole_survivor_history(player_id);
CREATE INDEX IF NOT EXISTS idx_sole_survivor_contestant ON sole_survivor_history(contestant_id);
CREATE INDEX IF NOT EXISTS idx_sole_survivor_active ON sole_survivor_history(player_id, end_episode) 
  WHERE end_episode IS NULL;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_episodes_is_current ON episodes(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_contestants_is_winner ON contestants(is_winner) WHERE is_winner = true;
CREATE INDEX IF NOT EXISTS idx_episode_scores_source ON episode_scores(source);

-- ============================================================================
-- SEED EVENT TYPES
-- ============================================================================

-- Insert predefined event types from requirements
INSERT INTO event_types (name, display_name, category, point_value, description) VALUES
  -- Basic Scoring Events
  ('individual_immunity_win', 'Individual Immunity Challenge Win', 'basic', 3, 'Won individual immunity challenge'),
  ('team_immunity_win', 'Team Immunity Challenge Win', 'basic', 2, 'Won team immunity challenge'),
  ('individual_reward_win', 'Individual Reward Challenge Win', 'basic', 2, 'Won individual reward challenge'),
  ('team_reward_win', 'Team Reward Challenge Win', 'basic', 1, 'Won team reward challenge'),
  ('found_hidden_idol', 'Found Hidden Immunity Idol', 'basic', 3, 'Found a hidden immunity idol'),
  ('played_idol_successfully', 'Played Idol Successfully', 'basic', 2, 'Successfully played an immunity idol'),
  ('tribe_member_eliminated', 'Tribe Member Eliminated', 'basic', 1, 'A member of their tribe was eliminated'),
  ('read_tree_mail', 'Read Tree Mail', 'basic', 1, 'Read tree mail to the tribe'),
  ('made_interesting_food', 'Made Interesting Food', 'basic', 1, 'Prepared interesting or notable food'),
  
  -- Penalty Events
  ('eliminated', 'Eliminated', 'penalty', -1, 'Voted out or eliminated from the game'),
  ('voted_out_with_idol', 'Voted Out with Idol', 'penalty', -3, 'Eliminated while holding an idol'),
  
  -- Bonus Events
  ('made_final_three', 'Made Final 3', 'bonus', 10, 'Reached the final three'),
  ('made_fire', 'Made Fire', 'bonus', 1, 'Successfully made fire in fire-making challenge'),
  ('played_shot_in_dark', 'Played Shot in the Dark', 'bonus', 1, 'Used shot in the dark advantage'),
  ('got_immunity_shot_in_dark', 'Got Immunity from Shot in the Dark', 'bonus', 4, 'Successfully gained immunity from shot in the dark')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE event_types IS 'Predefined scoring events with point values';
COMMENT ON TABLE contestant_events IS 'Records of events that occurred for contestants in episodes';
COMMENT ON TABLE sole_survivor_history IS 'Tracks when players changed their sole survivor selection';
COMMENT ON COLUMN episodes.is_current IS 'Indicates if this is the current episode for bonus calculations';
COMMENT ON COLUMN contestants.is_winner IS 'Indicates if this contestant won the season';
COMMENT ON COLUMN episode_scores.source IS 'Indicates if score was manually entered or calculated from events';
COMMENT ON COLUMN episode_scores.calculated_at IS 'Timestamp when score was last calculated from events';
