-- Update the eliminated penalty from -5 to -1
-- Run this in Supabase SQL Editor

UPDATE event_types 
SET point_value = -1 
WHERE name = 'eliminated';

-- Verify the update
SELECT name, display_name, point_value 
FROM event_types 
WHERE name = 'eliminated';
