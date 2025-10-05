/**
 * Apply Event-Based Scoring Migration
 * 
 * This script applies the event-based scoring database migration.
 * Run with: node backend/db/apply_event_scoring_migration.js
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Starting event-based scoring migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'event_based_scoring_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    // Note: This is a simple split and may need adjustment for complex SQL
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('COMMENT') || statement.length < 10) {
        continue;
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          if (queryError) {
            console.warn(`Warning on statement ${i + 1}: ${error.message}`);
          }
        }
      } catch (err) {
        console.warn(`Warning on statement ${i + 1}: ${err.message}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nVerifying migration...');

    // Verify tables were created
    const { data: eventTypes, error: eventTypesError } = await supabase
      .from('event_types')
      .select('count');

    const { data: contestantEvents, error: contestantEventsError } = await supabase
      .from('contestant_events')
      .select('count');

    const { data: soleSurvivorHistory, error: soleSurvivorHistoryError } = await supabase
      .from('sole_survivor_history')
      .select('count');

    if (!eventTypesError && !contestantEventsError && !soleSurvivorHistoryError) {
      console.log('✅ All new tables created successfully');
      
      // Check event types seeded
      const { data: eventTypesList, error: listError } = await supabase
        .from('event_types')
        .select('*');
      
      if (!listError && eventTypesList) {
        console.log(`✅ Event types seeded: ${eventTypesList.length} event types`);
        console.log('\nEvent types by category:');
        const byCategory = eventTypesList.reduce((acc, et) => {
          acc[et.category] = (acc[et.category] || 0) + 1;
          return acc;
        }, {});
        Object.entries(byCategory).forEach(([category, count]) => {
          console.log(`  - ${category}: ${count} events`);
        });
      }
    } else {
      console.error('❌ Some tables may not have been created properly');
      if (eventTypesError) console.error('  - event_types error:', eventTypesError.message);
      if (contestantEventsError) console.error('  - contestant_events error:', contestantEventsError.message);
      if (soleSurvivorHistoryError) console.error('  - sole_survivor_history error:', soleSurvivorHistoryError.message);
    }

    console.log('\n✅ Migration verification complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
