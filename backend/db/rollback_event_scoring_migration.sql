-- Rollback Event-Based Scoring Migration
-- This script removes all changes made by the event-based scoring migration

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_contestant_events_episode;
DROP INDEX IF EXISTS idx_contestant_events_contestant;
DROP INDEX IF EXISTS idx_contestant_events_type;
DROP INDEX IF EXISTS idx_contestant_events_created_by;
DROP INDEX IF EXISTS idx_sole_survivor_player;
DROP INDEX IF EXISTS idx_sole_survivor_contestant;
DROP INDEX IF EXISTS idx_sole_survivor_active;
DROP INDEX IF EXISTS idx_episodes_is_current;
DROP INDEX IF EXISTS idx_contestants_is_winner;
DROP INDEX IF EXISTS idx_episode_scores_source;

-- ============================================================================
-- DROP TABLES
-- ============================================================================

DROP TABLE IF EXISTS contestant_events CASCADE;
DROP TABLE IF EXISTS sole_survivor_history CASCADE;
DROP TABLE IF EXISTS event_types CASCADE;

-- ============================================================================
-- REMOVE COLUMNS FROM EXISTING TABLES
-- ============================================================================

ALTER TABLE episodes 
  DROP COLUMN IF EXISTS is_current,
  DROP COLUMN IF EXISTS aired_date;

ALTER TABLE contestants 
  DROP COLUMN IF EXISTS is_winner;

ALTER TABLE episode_scores 
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS calculated_at;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this rollback, the database should be back to its original state
-- before the event-based scoring migration was applied.
