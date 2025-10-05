/**
 * Migration script to populate sole_survivor_history table
 * with existing sole survivor selections from players table
 * 
 * This script:
 * 1. Queries all players with sole_survivor_id set
 * 2. Creates initial sole_survivor_history records
 * 3. Sets start_episode = 1, end_episode = NULL (current selection)
 * 
 * Run with: node backend/db/migrate_sole_survivor_history.js
 */

const supabase = require('./supabase');

async function migrateSoleSurvivorHistory() {
  console.log('Starting sole survivor history migration...\n');

  try {
    // Query all players with sole_survivor_id set
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, sole_survivor_id')
      .not('sole_survivor_id', 'is', null);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      process.exit(1);
    }

    if (!players || players.length === 0) {
      console.log('No players with sole survivor selections found.');
      console.log('Migration complete - nothing to migrate.\n');
      return;
    }

    console.log(`Found ${players.length} player(s) with sole survivor selections:\n`);

    // Check if any history records already exist
    const { data: existingHistory, error: historyCheckError } = await supabase
      .from('sole_survivor_history')
      .select('player_id')
      .in('player_id', players.map(p => p.id));

    if (historyCheckError) {
      console.error('Error checking existing history:', historyCheckError);
      process.exit(1);
    }

    const existingPlayerIds = new Set(existingHistory?.map(h => h.player_id) || []);

    // Filter out players who already have history records
    const playersToMigrate = players.filter(p => !existingPlayerIds.has(p.id));

    if (playersToMigrate.length === 0) {
      console.log('All players already have history records.');
      console.log('Migration complete - nothing to migrate.\n');
      return;
    }

    console.log(`Migrating ${playersToMigrate.length} player(s):\n`);

    // Create initial sole_survivor_history records
    const historyRecords = playersToMigrate.map(player => ({
      player_id: player.id,
      contestant_id: player.sole_survivor_id,
      start_episode: 1,
      end_episode: null // Current selection
    }));

    const { data: insertedRecords, error: insertError } = await supabase
      .from('sole_survivor_history')
      .insert(historyRecords)
      .select();

    if (insertError) {
      console.error('Error inserting history records:', insertError);
      process.exit(1);
    }

    console.log(`✓ Successfully created ${insertedRecords.length} history record(s)\n`);

    // Display summary
    console.log('Migration Summary:');
    console.log('─'.repeat(60));
    playersToMigrate.forEach(player => {
      console.log(`Player ID ${player.id} (${player.name || 'Unknown'}): Contestant ID ${player.sole_survivor_id}`);
    });
    console.log('─'.repeat(60));
    console.log('\nMigration completed successfully! ✓\n');

  } catch (error) {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateSoleSurvivorHistory();
