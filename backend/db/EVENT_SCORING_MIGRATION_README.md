# Event-Based Scoring Migration

This directory contains the database migration for the Event-Based Scoring feature.

## Overview

The Event-Based Scoring migration adds the following to the database:

### New Tables

1. **event_types** - Predefined scoring events with point values
   - Stores events like "Individual Immunity Win", "Eliminated", etc.
   - Organized by category (basic, penalty, bonus)
   - Seeded with 15 predefined event types

2. **contestant_events** - Records of events that occurred
   - Links episodes, contestants, and event types
   - Snapshots point values at time of recording
   - Tracks which admin created the event

3. **sole_survivor_history** - Tracks sole survivor selection changes
   - Records when players change their sole survivor pick
   - Tracks start and end episodes for each selection
   - Enables contiguous period bonus calculations

### Modified Tables

- **episodes**: Added `is_current` (boolean) and `aired_date` (date)
- **contestants**: Added `is_winner` (boolean)
- **episode_scores**: Added `source` (text) and `calculated_at` (timestamp)

### Indexes

Created indexes on:
- contestant_events: episode_id, contestant_id, event_type_id, created_by
- sole_survivor_history: player_id, contestant_id, active selections
- New columns: is_current, is_winner, source

## Files

- `event_based_scoring_migration.sql` - Main migration SQL
- `apply_event_scoring_migration.js` - Node.js script to apply migration
- `test_event_scoring_migration.js` - Verification script
- `rollback_event_scoring_migration.sql` - Rollback script
- `EVENT_SCORING_MIGRATION_README.md` - This file

## How to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `event_based_scoring_migration.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

### Option 2: Using Node.js Script

```bash
# From the project root
node backend/db/apply_event_scoring_migration.js
```

This script will:
- Read the migration SQL file
- Execute each statement
- Verify tables were created
- Display seeded event types

## How to Verify Migration

Run the test script to verify everything was created correctly:

```bash
node backend/db/test_event_scoring_migration.js
```

This will check:
- All tables exist and are accessible
- Required columns are present
- Event types are seeded correctly
- Foreign key constraints work
- New columns added to existing tables

## How to Rollback

If you need to undo the migration:

### Using Supabase Dashboard

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `rollback_event_scoring_migration.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

This will:
- Drop all new tables (event_types, contestant_events, sole_survivor_history)
- Remove new columns from existing tables
- Drop all new indexes

**⚠️ Warning**: Rollback will delete all event data. Make sure to backup if needed.

## Seeded Event Types

The migration seeds 15 event types:

### Basic Scoring (9 events)
- Individual Immunity Challenge Win: +3 points
- Team Immunity Challenge Win: +2 points
- Individual Reward Challenge Win: +2 points
- Team Reward Challenge Win: +1 point
- Found Hidden Immunity Idol: +3 points
- Played Idol Successfully: +2 points
- Tribe Member Eliminated: +1 point
- Read Tree Mail: +1 point
- Made Interesting Food: +1 point

### Penalties (2 events)
- Eliminated: -1 point
- Voted Out with Idol: -3 points

### Bonuses (4 events)
- Made Final 3: +10 points
- Made Fire: +1 point
- Played Shot in the Dark: +1 point
- Got Immunity from Shot in the Dark: +4 points

## Database Schema Diagram

```
┌─────────────────┐
│  event_types    │
│─────────────────│
│ id (PK)         │
│ name            │
│ display_name    │
│ category        │
│ point_value     │
│ is_active       │
└─────────────────┘
         │
         │ (FK)
         ▼
┌─────────────────────┐      ┌──────────────┐
│ contestant_events   │──────│  episodes    │
│─────────────────────│ (FK) │──────────────│
│ id (PK)             │      │ id (PK)      │
│ episode_id (FK)     │      │ episode_num  │
│ contestant_id (FK)  │      │ is_current ✨│
│ event_type_id (FK)  │      │ aired_date ✨│
│ point_value         │      └──────────────┘
│ created_by (FK)     │
└─────────────────────┘
         │
         │ (FK)
         ▼
┌─────────────────────┐
│   contestants       │
│─────────────────────│
│ id (PK)             │
│ name                │
│ total_score         │
│ is_eliminated       │
│ is_winner ✨        │
└─────────────────────┘
         │
         │ (FK)
         ▼
┌──────────────────────────┐      ┌──────────────┐
│ sole_survivor_history    │──────│   players    │
│──────────────────────────│ (FK) │──────────────│
│ id (PK)                  │      │ id (PK)      │
│ player_id (FK)           │      │ email        │
│ contestant_id (FK)       │      │ name         │
│ start_episode            │      │ is_admin     │
│ end_episode (nullable)   │      └──────────────┘
└──────────────────────────┘

┌─────────────────────┐
│  episode_scores     │
│─────────────────────│
│ id (PK)             │
│ episode_id (FK)     │
│ contestant_id (FK)  │
│ score               │
│ source ✨           │
│ calculated_at ✨    │
└─────────────────────┘

✨ = New columns added by this migration
```

## Troubleshooting

### Error: Table already exists

If you see "table already exists" errors, the migration may have been partially applied. You can:
1. Run the rollback script first
2. Then re-run the migration

### Error: Permission denied

Make sure your Supabase key has sufficient permissions to:
- Create tables
- Alter tables
- Create indexes
- Insert data

### Error: Cannot connect to database

Check that your `.env` file has the correct values:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## Migration Scripts

### apply_event_scoring_migration.js

Applies the full migration by executing the SQL file. Usage:

```bash
node backend/db/apply_event_scoring_migration.js
```

**What it does:**
- Reads `event_based_scoring_migration.sql`
- Executes all CREATE TABLE, ALTER TABLE, and INSERT statements
- Verifies tables were created successfully
- Displays seeded event types

**Output:**
- Success message with table counts
- List of seeded event types
- Error messages if any step fails

### test_event_scoring_migration.js

Verifies the migration was applied correctly. Usage:

```bash
node backend/db/test_event_scoring_migration.js
```

**What it checks:**
- All three new tables exist (event_types, contestant_events, sole_survivor_history)
- New columns exist on modified tables (is_current, aired_date, is_winner, source, calculated_at)
- Event types are seeded (should have 15 records)
- Foreign key constraints work
- Indexes are created

**Output:**
- ✅ for each successful check
- ❌ for any failures with details
- Summary of test results

### check_migration_status.js

Checks if the migration has been applied. Usage:

```bash
node backend/db/check_migration_status.js
```

**What it checks:**
- Whether new tables exist
- Whether new columns exist
- Whether event types are seeded
- Migration status (complete, partial, or not applied)

**Output:**
- Status report showing what's been applied
- Recommendations for next steps

### create_initial_sole_survivor_history.js

Creates initial history records for existing sole survivor selections. Usage:

```bash
node backend/db/create_initial_sole_survivor_history.js
```

**What it does:**
- Queries all players with sole_survivor_id set
- Creates sole_survivor_history records with start_episode = 1
- Sets end_episode = NULL (current selection)

**When to run:**
- After applying the migration
- Before players start changing their sole survivor picks
- Only needs to be run once

### migrate_sole_survivor_history.js

Alternative script for migrating sole survivor data with more options. Usage:

```bash
node backend/db/migrate_sole_survivor_history.js
```

**What it does:**
- Similar to create_initial_sole_survivor_history.js
- Includes additional validation
- Can handle edge cases

## Rollback Instructions

### When to Rollback

Consider rolling back if:
- Migration caused unexpected issues
- Need to modify the schema before re-applying
- Testing in development environment
- Critical bug discovered in production

### Rollback Process

1. **Backup Data First** (if in production)
   ```sql
   -- Export event data
   COPY contestant_events TO '/tmp/contestant_events_backup.csv' CSV HEADER;
   COPY sole_survivor_history TO '/tmp/sole_survivor_history_backup.csv' CSV HEADER;
   ```

2. **Run Rollback Script**
   - Via Supabase Dashboard: Copy and run `rollback_event_scoring_migration.sql`
   - Via command line: Execute the SQL file through your database client

3. **Verify Rollback**
   ```bash
   node backend/db/check_migration_status.js
   ```
   Should show "Migration not applied"

4. **Fix Issues**
   - Modify migration SQL if needed
   - Update scripts if necessary

5. **Re-apply Migration**
   ```bash
   node backend/db/apply_event_scoring_migration.js
   ```

### What Gets Deleted

The rollback script removes:
- ❌ All event_types records (15 seeded events)
- ❌ All contestant_events records (all recorded events)
- ❌ All sole_survivor_history records (selection history)
- ❌ New columns: is_current, aired_date, is_winner, source, calculated_at
- ❌ All indexes created by the migration

### What Stays Intact

The rollback preserves:
- ✅ All existing tables (contestants, players, episodes, etc.)
- ✅ All existing data in those tables
- ✅ Current sole_survivor_id on players table
- ✅ Existing episode_scores records

## Data Migration Considerations

### Existing Manual Scores

The migration is designed to work alongside existing manual scores:

- **episode_scores.source** column tracks whether a score was manually entered or calculated from events
- Manual scores have `source = 'manual'`
- Event-based scores have `source = 'events'`
- Both types can coexist during transition period

### Migrating Historical Data

If you want to convert historical manual scores to events:

1. **Option A: Keep Manual Scores**
   - Leave historical episodes as manual scores
   - Use event-based system for new episodes only
   - Simplest approach, no data conversion needed

2. **Option B: Partial Conversion**
   - Convert recent episodes to events
   - Keep older episodes as manual scores
   - Requires manual review of episode footage/notes

3. **Option C: Full Conversion**
   - Convert all historical episodes to events
   - Most accurate but time-consuming
   - Requires detailed episode notes or re-watching

### Sole Survivor History

For existing leagues with sole survivor picks:

1. **Run Initial History Script**
   ```bash
   node backend/db/create_initial_sole_survivor_history.js
   ```

2. **Verify Records Created**
   ```sql
   SELECT p.name, c.name as sole_survivor, ssh.start_episode
   FROM sole_survivor_history ssh
   JOIN players p ON ssh.player_id = p.id
   JOIN contestants c ON ssh.contestant_id = c.id
   WHERE ssh.end_episode IS NULL;
   ```

3. **All Records Should Have:**
   - start_episode = 1 (or current episode if mid-season)
   - end_episode = NULL (current selection)

## Performance Considerations

### Indexes

The migration creates indexes on:
- `contestant_events(episode_id)` - Fast lookup of events by episode
- `contestant_events(contestant_id)` - Fast lookup of events by contestant
- `contestant_events(event_type_id)` - Fast lookup by event type
- `sole_survivor_history(player_id)` - Fast lookup of player history
- `sole_survivor_history(player_id, end_episode)` - Fast lookup of current selection

### Query Performance

Expected query times (approximate):
- Get events for episode: < 50ms
- Calculate contestant score: < 100ms
- Get sole survivor history: < 50ms
- Recalculate all scores: < 5 seconds (for 20 contestants, 10 episodes)

### Optimization Tips

1. **Use Indexes** - All foreign keys are indexed
2. **Batch Operations** - Use bulk insert for multiple events
3. **Cache Calculations** - Cache leaderboard, recalculate only on changes
4. **Limit Queries** - Select only needed columns

## Security Considerations

### Row Level Security (RLS)

Consider enabling RLS on new tables:

```sql
-- Enable RLS
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestant_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sole_survivor_history ENABLE ROW LEVEL SECURITY;

-- Allow all users to read event types
CREATE POLICY "Event types are viewable by everyone"
  ON event_types FOR SELECT
  USING (true);

-- Only admins can modify events
CREATE POLICY "Only admins can insert events"
  ON contestant_events FOR INSERT
  WITH CHECK (auth.jwt() ->> 'is_admin' = 'true');

-- Players can view their own history
CREATE POLICY "Players can view own history"
  ON sole_survivor_history FOR SELECT
  USING (player_id = (auth.jwt() ->> 'id')::int);
```

### Audit Trail

The migration includes audit fields:
- `contestant_events.created_by` - Tracks which admin created the event
- `contestant_events.created_at` - Timestamp of event creation
- `sole_survivor_history.created_at` - Timestamp of selection change

These enable:
- Tracking who made changes
- Identifying when errors were introduced
- Reviewing admin activity

## Backup Recommendations

### Before Migration

1. **Full Database Backup**
   - Use Supabase dashboard backup feature
   - Or export all tables to CSV/SQL

2. **Test in Development First**
   - Apply migration to dev environment
   - Test all functionality
   - Verify rollback works

### After Migration

1. **Verify Data Integrity**
   - Run test script
   - Check sample queries
   - Verify existing data unchanged

2. **Regular Backups**
   - Schedule automatic backups
   - Keep backups for at least 30 days
   - Test restore process

## Troubleshooting Common Issues

### Issue: Foreign Key Constraint Violation

**Symptom:** Error when inserting into contestant_events

**Cause:** Referenced episode, contestant, or event_type doesn't exist

**Solution:**
```sql
-- Check if episode exists
SELECT * FROM episodes WHERE id = <episode_id>;

-- Check if contestant exists
SELECT * FROM contestants WHERE id = <contestant_id>;

-- Check if event type exists
SELECT * FROM event_types WHERE id = <event_type_id>;
```

### Issue: Duplicate Event Types

**Symptom:** Error "duplicate key value violates unique constraint"

**Cause:** Event types already seeded or migration run twice

**Solution:**
```sql
-- Check existing event types
SELECT * FROM event_types;

-- If duplicates exist, rollback and re-apply
-- Or manually delete duplicates
```

### Issue: Missing Columns

**Symptom:** Error "column does not exist"

**Cause:** ALTER TABLE statements didn't execute

**Solution:**
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'episodes' AND column_name = 'is_current';

-- If missing, run ALTER TABLE statements manually
ALTER TABLE episodes ADD COLUMN is_current BOOLEAN DEFAULT false;
```

### Issue: Slow Queries

**Symptom:** Event queries taking too long

**Cause:** Missing indexes or large dataset

**Solution:**
```sql
-- Check if indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'contestant_events';

-- If missing, create indexes manually
CREATE INDEX idx_contestant_events_episode ON contestant_events(episode_id);
```

## Next Steps

After applying the migration:

1. ✅ Verify migration with test script
2. ✅ Create initial sole survivor history records (if needed)
3. ✅ Test API endpoints for event management
4. ✅ Test admin event entry interface
5. ✅ Verify leaderboard includes sole survivor bonuses
6. ✅ Train admins on event entry process
7. ✅ Monitor performance and optimize if needed

## Support

For issues or questions about this migration, refer to:
- `backend/docs/EVENT_BASED_SCORING_API.md` - API documentation
- `backend/docs/ADMIN_EVENT_ENTRY_GUIDE.md` - Admin user guide
- `.kiro/specs/event-based-scoring/design.md` - Full design document
- `.kiro/specs/event-based-scoring/requirements.md` - Requirements
- `.kiro/specs/event-based-scoring/tasks.md` - Implementation tasks
