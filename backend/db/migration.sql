-- Survivor Fantasy League Database Schema

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS episode_scores CASCADE;
DROP TABLE IF EXISTS episodes CASCADE;
DROP TABLE IF EXISTS draft_picks CASCADE;
DROP TABLE IF EXISTS rankings CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS contestants CASCADE;

-- Contestants table
CREATE TABLE contestants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  profession TEXT,
  image_url TEXT,
  total_score INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_image_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  has_submitted_rankings BOOLEAN DEFAULT false,
  sole_survivor_id INTEGER REFERENCES contestants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rankings table
CREATE TABLE rankings (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES contestants(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, contestant_id)
);

-- Draft picks table
CREATE TABLE draft_picks (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES contestants(id) ON DELETE CASCADE,
  pick_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, contestant_id)
);

-- Draft status table (for transaction-like behavior)
CREATE TABLE draft_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Episodes table
CREATE TABLE episodes (
  id SERIAL PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Episode scores table
CREATE TABLE episode_scores (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES contestants(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(episode_id, contestant_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_rankings_player_id ON rankings(player_id);
CREATE INDEX idx_rankings_contestant_id ON rankings(contestant_id);
CREATE INDEX idx_draft_picks_player_id ON draft_picks(player_id);
CREATE INDEX idx_draft_picks_contestant_id ON draft_picks(contestant_id);
CREATE INDEX idx_episode_scores_episode_id ON episode_scores(episode_id);
CREATE INDEX idx_episode_scores_contestant_id ON episode_scores(contestant_id);
CREATE INDEX idx_players_email ON players(email);

-- Initialize draft status
INSERT INTO draft_status (id, is_complete) VALUES (1, false);
