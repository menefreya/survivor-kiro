-- Migration: Add draft_status table
-- Description: Creates the draft_status table to track draft completion status
-- Date: 2025-01-04

-- Create draft_status table
CREATE TABLE IF NOT EXISTS draft_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial row (only if it doesn't exist)
INSERT INTO draft_status (id, is_complete, completed_at)
VALUES (1, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE draft_status IS 'Tracks the status of the draft process. Should only contain one row.';
COMMENT ON COLUMN draft_status.id IS 'Always 1 - ensures single row';
COMMENT ON COLUMN draft_status.is_complete IS 'Whether the draft has been completed';
COMMENT ON COLUMN draft_status.completed_at IS 'Timestamp when draft was completed';
