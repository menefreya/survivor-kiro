/**
 * Create Initial Sole Survivor History Records
 * 
 * This script creates initial sole_survivor_history records for all players
 * who currently have a sole_survivor_id set. This should be run once after
 * the migration to populate historical data.
 * 
 * Run with: node backend/db/create_initial_sole_survivor_history.js
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

async function createInitialHistory() {
  console.log('Creating Initial Sole Survivor History Records\n');
  console.log('='.repeat(60));

  try {
    // Get all players with a sole survivor selected
    console.log('\n📋 Fetching players with sole survivor selections...');
    
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, sole_survivor_id')
      .not('sole_survivor_id', 'is', null);

    if (playersError) throw playersError;

    if (!players || players.length === 0) {
      console.log('  ℹ️  No players have sole survivor selections yet');
      console.log('\n✅ Nothing to do - all set!\n');
      return;
    }

    console.log(`  ✅ Found ${players.length} players with sole survivor selections`);

    // Check if history records already exist
    console.log('\n📋 Checking for existing history records...');
    
    const { data: existingHistory, error: historyError } = await supabase
      .from('sole_survivor_history')
      .select('player_id');

    if (historyError) throw historyError;

    const existingPlayerIds = new Set(existingHistory?.map(h => h.player_id) || []);
    const playersNeedingHistory = players.filter(p => !existingPlayerIds.has(p.id));

    if (playersNeedingHistory.length === 0) {
      console.log('  ℹ️  All players already have history records');
      console.log('\n✅ Nothing to do - history already created!\n');
      return;
    }

    console.log(`  ✅ ${playersNeedingHistory.length} players need history records`);

    // Create history records
    console.log('\n📋 Creating history records...');

    const historyRecords = playersNeedingHistory.map(player => ({
      player_id: player.id,
      contestant_id: player.sole_survivor_id,
      start_episode: 1,
      end_episode: null // Current selection
    }));

    const { data: insertedRecords, error: insertError } = await supabase
      .from('sole_survivor_history')
      .insert(historyRecords)
      .select();

    if (insertError) throw insertError;

    console.log(`  ✅ Created ${insertedRecords.length} history records`);

    // Display summary
    console.log('\n📊 Summary:');
    console.log(`  - Total players with sole survivor: ${players.length}`);
    console.log(`  - Already had history: ${players.length - playersNeedingHistory.length}`);
    console.log(`  - New history records created: ${insertedRecords.length}`);

    // Display created records
    if (insertedRecords.length > 0) {
      console.log('\n📋 Created records:');
      for (const record of insertedRecords) {
        const player = players.find(p => p.id === record.player_id);
        console.log(`  - Player: ${player.name} (ID: ${player.id})`);
        console.log(`    Contestant ID: ${record.contestant_id}`);
        console.log(`    Start Episode: ${record.start_episode}`);
        console.log(`    Status: Current selection (end_episode: NULL)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Initial sole survivor history created successfully!\n');

  } catch (error) {
    console.error('\n❌ Error creating history:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createInitialHistory();
