/**
 * Check Event-Based Scoring Migration Status
 * 
 * This script checks if the migration has been applied.
 * Run with: node backend/db/check_migration_status.js
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrationStatus() {
  console.log('Checking Event-Based Scoring Migration Status\n');
  console.log('='.repeat(60));

  let migrationNeeded = false;

  // Check if event_types table exists
  console.log('\n📋 Checking new tables...');
  
  const { data: eventTypes, error: eventTypesError } = await supabase
    .from('event_types')
    .select('count')
    .limit(1);

  if (eventTypesError) {
    console.log('  ❌ event_types table: NOT FOUND');
    migrationNeeded = true;
  } else {
    console.log('  ✅ event_types table: EXISTS');
  }

  const { data: contestantEvents, error: contestantEventsError } = await supabase
    .from('contestant_events')
    .select('count')
    .limit(1);

  if (contestantEventsError) {
    console.log('  ❌ contestant_events table: NOT FOUND');
    migrationNeeded = true;
  } else {
    console.log('  ✅ contestant_events table: EXISTS');
  }

  const { data: soleSurvivorHistory, error: soleSurvivorHistoryError } = await supabase
    .from('sole_survivor_history')
    .select('count')
    .limit(1);

  if (soleSurvivorHistoryError) {
    console.log('  ❌ sole_survivor_history table: NOT FOUND');
    migrationNeeded = true;
  } else {
    console.log('  ✅ sole_survivor_history table: EXISTS');
  }

  // Check if new columns exist
  console.log('\n📋 Checking modified tables...');

  const { data: episodes, error: episodesError } = await supabase
    .from('episodes')
    .select('*')
    .limit(1);

  if (!episodesError && episodes && episodes.length > 0) {
    const hasIsCurrentColumn = 'is_current' in episodes[0];
    const hasAiredDateColumn = 'aired_date' in episodes[0];
    
    if (hasIsCurrentColumn && hasAiredDateColumn) {
      console.log('  ✅ episodes table: New columns added');
    } else {
      console.log('  ❌ episodes table: Missing new columns');
      migrationNeeded = true;
    }
  } else {
    console.log('  ⚠️  episodes table: Cannot verify (no data)');
  }

  const { data: contestants, error: contestantsError } = await supabase
    .from('contestants')
    .select('*')
    .limit(1);

  if (!contestantsError && contestants && contestants.length > 0) {
    const hasIsWinnerColumn = 'is_winner' in contestants[0];
    
    if (hasIsWinnerColumn) {
      console.log('  ✅ contestants table: New column added');
    } else {
      console.log('  ❌ contestants table: Missing new column');
      migrationNeeded = true;
    }
  } else {
    console.log('  ⚠️  contestants table: Cannot verify (no data)');
  }

  const { data: episodeScores, error: episodeScoresError } = await supabase
    .from('episode_scores')
    .select('*')
    .limit(1);

  if (!episodeScoresError && episodeScores && episodeScores.length > 0) {
    const hasSourceColumn = 'source' in episodeScores[0];
    const hasCalculatedAtColumn = 'calculated_at' in episodeScores[0];
    
    if (hasSourceColumn && hasCalculatedAtColumn) {
      console.log('  ✅ episode_scores table: New columns added');
    } else {
      console.log('  ❌ episode_scores table: Missing new columns');
      migrationNeeded = true;
    }
  } else {
    console.log('  ⚠️  episode_scores table: Cannot verify (no data)');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  
  if (migrationNeeded) {
    console.log('\n❌ MIGRATION NEEDED\n');
    console.log('To apply the migration:');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy the contents of: backend/db/event_based_scoring_migration.sql');
    console.log('4. Paste into SQL Editor and click "Run"');
    console.log('5. Run this script again to verify\n');
  } else {
    console.log('\n✅ MIGRATION ALREADY APPLIED\n');
    
    // Show event types count if available
    if (!eventTypesError) {
      const { data: eventTypesList } = await supabase
        .from('event_types')
        .select('*');
      
      if (eventTypesList) {
        console.log(`Event types seeded: ${eventTypesList.length} types`);
        const byCategory = eventTypesList.reduce((acc, et) => {
          acc[et.category] = (acc[et.category] || 0) + 1;
          return acc;
        }, {});
        console.log('By category:');
        Object.entries(byCategory).forEach(([category, count]) => {
          console.log(`  - ${category}: ${count} events`);
        });
        console.log('');
      }
    }
  }
}

checkMigrationStatus().catch(error => {
  console.error('Error checking migration status:', error);
  process.exit(1);
});
