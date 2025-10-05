# Event-Based Scoring Migration Guide

## Quick Start

Follow these steps to apply the Event-Based Scoring database migration:

### Step 1: Check Migration Status

```bash
node backend/db/check_migration_status.js
```

This will tell you if the migration needs to be applied.

### Step 2: Apply Migration via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration SQL**
   - Open `backend/db/event_based_scoring_migration.sql`
   - Copy the entire contents (Ctrl+A, Ctrl+C)

4. **Execute Migration**
   - Paste into the SQL Editor
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (should take a few seconds)

5. **Verify Success**
   - You should see "Success. No rows returned"
   - Check that no errors are displayed

### Step 3: Verify Migration

```bash
node backend/db/test_event_scoring_migration.js
```

This will run comprehensive tests to verify:
- All tables were created
- All columns were added
- Event types were seeded
- Indexes were created
- Foreign keys work correctly

## What Gets Created

### New Tables (3)

1. **event_types** - 15 predefined scoring events
2. **contestant_events** - Records of events per episode
3. **sole_survivor_history** - Tracks sole survivor changes

### Modified Tables (3)

1. **episodes** - Added `is_current`, `aired_date`
2. **contestants** - Added `is_winner`
3. **episode_scores** - Added `source`, `calculated_at`

### Indexes (9)

Performance indexes on all foreign keys and frequently queried columns.

## Troubleshooting

### Error: "relation already exists"

The migration has already been partially applied. Options:
1. Run the rollback script first (see below)
2. Or manually check which tables exist and apply only missing parts

### Error: "permission denied"

You need to use the service role key, not the anon key:
1. Go to Supabase Dashboard > Settings > API
2. Copy the "service_role" key (not "anon" key)
3. Update `SUPABASE_KEY` in your `.env` file
4. Try again

### Error: "syntax error"

Make sure you copied the entire SQL file without truncation.

## Rollback (If Needed)

To undo the migration:

1. Open Supabase Dashboard > SQL Editor
2. Copy contents of `backend/db/rollback_event_scoring_migration.sql`
3. Paste and click "Run"

**⚠️ Warning**: This will delete all event data!

## Manual Verification

If you prefer to verify manually in Supabase Dashboard:

1. Go to "Table Editor"
2. Check that these tables exist:
   - event_types
   - contestant_events
   - sole_survivor_history
3. Click on "event_types" and verify 15 rows exist
4. Click on "episodes" and verify "is_current" column exists
5. Click on "contestants" and verify "is_winner" column exists

## Next Steps After Migration

1. ✅ Verify migration completed successfully
2. Create initial sole survivor history records (if needed)
3. Proceed to Task 2: Event type management API
4. Build admin event entry interface
5. Update leaderboard calculations

## Files Reference

- `event_based_scoring_migration.sql` - Main migration (run this)
- `check_migration_status.js` - Check if migration needed
- `test_event_scoring_migration.js` - Comprehensive verification
- `rollback_event_scoring_migration.sql` - Undo migration
- `MIGRATION_GUIDE.md` - This file
- `EVENT_SCORING_MIGRATION_README.md` - Detailed documentation

## Support

For detailed information about the schema and design decisions, see:
- `.kiro/specs/event-based-scoring/design.md`
- `.kiro/specs/event-based-scoring/requirements.md`
