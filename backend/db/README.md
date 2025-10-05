# Database Setup

## Running the Migration

To set up the database schema in Supabase:

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `migration.sql`
4. Paste and execute the SQL script

Alternatively, you can use the Supabase CLI:

```bash
supabase db push
```

## Schema Overview

The database consists of 6 tables:

- **contestants**: Survivor contestants with profiles and scores
- **players**: Users with authentication credentials and profile images
- **rankings**: Player preferences for draft order
- **draft_picks**: Assigned contestants per player (2 per player)
- **episodes**: Episode records
- **episode_scores**: Scores per contestant per episode

## Environment Variables

Make sure to update the `.env` file with your actual Supabase credentials:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

You can find your Supabase URL and API key in your project settings under "API".
