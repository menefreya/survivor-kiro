# Database Setup

## Running the Initial Migration

To set up the base database schema in Supabase:

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `migration.sql`
4. Paste and execute the SQL script

Alternatively, you can use the Supabase CLI:

```bash
supabase db push
```

## Event-Based Scoring Migration

For the Event-Based Scoring feature, see:
- **Quick Start**: `MIGRATION_GUIDE.md`
- **Detailed Docs**: `EVENT_SCORING_MIGRATION_README.md`
- **Migration SQL**: `event_based_scoring_migration.sql`

To apply the event-based scoring migration:
```bash
# Check if migration is needed
node backend/db/check_migration_status.js

# Then apply via Supabase Dashboard SQL Editor
# (See MIGRATION_GUIDE.md for detailed instructions)

# Verify migration
node backend/db/test_event_scoring_migration.js
```

## Schema Overview

### Base Tables (6)

- **contestants**: Survivor contestants with profiles and scores
- **players**: Users with authentication credentials and profile images
- **rankings**: Player preferences for draft order
- **draft_picks**: Assigned contestants per player (2 per player)
- **episodes**: Episode records
- **episode_scores**: Scores per contestant per episode

### Event-Based Scoring Tables (3)

- **event_types**: Predefined scoring events with point values
- **contestant_events**: Records of events that occurred per episode
- **sole_survivor_history**: Tracks sole survivor selection changes

## Environment Variables

Make sure to update the `.env` file with your actual Supabase credentials:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

You can find your Supabase URL and API key in your project settings under "API".
