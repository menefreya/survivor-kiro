# 🚀 Ready to Apply Event-Based Scoring Migration

## Current Status

✅ Migration files created and ready
❌ Migration not yet applied to database

## Quick Apply (3 Steps)

### Step 1: Check Status
```bash
node backend/db/check_migration_status.js
```

### Step 2: Apply Migration

**Option A: Supabase Dashboard (Recommended)**

1. Open: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in sidebar
4. Click "New query"
5. Open file: `backend/db/event_based_scoring_migration.sql`
6. Copy ALL contents (Ctrl+A, Ctrl+C)
7. Paste into SQL Editor
8. Click "Run" (or Ctrl+Enter)
9. Wait for "Success. No rows returned"

**Option B: Supabase CLI** (if installed)
```bash
supabase db execute -f backend/db/event_based_scoring_migration.sql
```

### Step 3: Verify
```bash
node backend/db/test_event_scoring_migration.js
```

Expected output: "✅ ALL TESTS PASSED - Migration successful!"

## What Will Be Created

- ✅ 3 new tables (event_types, contestant_events, sole_survivor_history)
- ✅ 5 new columns (episodes.is_current, contestants.is_winner, etc.)
- ✅ 9 performance indexes
- ✅ 15 seeded event types

## After Migration

Run this to create initial history for existing players:
```bash
node backend/db/create_initial_sole_survivor_history.js
```

## Need Help?

- **Quick Guide**: See `MIGRATION_GUIDE.md`
- **Detailed Docs**: See `EVENT_SCORING_MIGRATION_README.md`
- **Troubleshooting**: Check the guides above

## Rollback (If Needed)

If something goes wrong:
1. Open Supabase Dashboard > SQL Editor
2. Copy contents of `rollback_event_scoring_migration.sql`
3. Paste and Run

---

**Ready?** Start with Step 1 above! 🎯
