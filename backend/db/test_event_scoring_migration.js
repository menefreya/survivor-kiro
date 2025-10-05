/**
 * Test Event-Based Scoring Migration
 * 
 * This script verifies that the migration was applied correctly.
 * Run with: node backend/db/test_event_scoring_migration.js
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

async function testMigration() {
  console.log('Testing Event-Based Scoring Migration\n');
  console.log('=' .repeat(60));
  
  let allTestsPassed = true;

  // Test 1: Verify event_types table exists and has data
  console.log('\n✓ Test 1: event_types table');
  try {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('category, name');

    if (error) throw error;

    console.log(`  ✅ Table exists with ${data.length} event types`);
    
    // Verify required columns
    if (data.length > 0) {
      const firstEvent = data[0];
      const requiredColumns = ['id', 'name', 'display_name', 'category', 'point_value', 'is_active'];
      const hasAllColumns = requiredColumns.every(col => col in firstEvent);
      
      if (hasAllColumns) {
        console.log('  ✅ All required columns present');
      } else {
        console.log('  ❌ Missing required columns');
        allTestsPassed = false;
      }
    }

    // Verify categories
    const categories = [...new Set(data.map(e => e.category))];
    const expectedCategories = ['basic', 'penalty', 'bonus'];
    const hasAllCategories = expectedCategories.every(cat => categories.includes(cat));
    
    if (hasAllCategories) {
      console.log(`  ✅ All categories present: ${categories.join(', ')}`);
    } else {
      console.log(`  ❌ Missing categories. Found: ${categories.join(', ')}`);
      allTestsPassed = false;
    }

    // Display event types by category
    console.log('\n  Event Types by Category:');
    expectedCategories.forEach(category => {
      const events = data.filter(e => e.category === category);
      console.log(`\n  ${category.toUpperCase()}:`);
      events.forEach(e => {
        console.log(`    - ${e.display_name}: ${e.point_value > 0 ? '+' : ''}${e.point_value} points`);
      });
    });

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Verify contestant_events table exists
  console.log('\n\n✓ Test 2: contestant_events table');
  try {
    const { error } = await supabase
      .from('contestant_events')
      .select('count')
      .limit(0);

    if (error) throw error;
    console.log('  ✅ Table exists and is accessible');
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Verify sole_survivor_history table exists
  console.log('\n✓ Test 3: sole_survivor_history table');
  try {
    const { error } = await supabase
      .from('sole_survivor_history')
      .select('count')
      .limit(0);

    if (error) throw error;
    console.log('  ✅ Table exists and is accessible');
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 4: Verify episodes table has new columns
  console.log('\n✓ Test 4: episodes table new columns');
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data.length > 0) {
      const episode = data[0];
      const hasIsCurrentColumn = 'is_current' in episode;
      const hasAiredDateColumn = 'aired_date' in episode;

      if (hasIsCurrentColumn && hasAiredDateColumn) {
        console.log('  ✅ New columns added: is_current, aired_date');
      } else {
        console.log('  ❌ Missing new columns');
        if (!hasIsCurrentColumn) console.log('    - Missing: is_current');
        if (!hasAiredDateColumn) console.log('    - Missing: aired_date');
        allTestsPassed = false;
      }
    } else {
      console.log('  ⚠️  No episodes exist to test columns');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 5: Verify contestants table has new columns
  console.log('\n✓ Test 5: contestants table new columns');
  try {
    const { data, error } = await supabase
      .from('contestants')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data.length > 0) {
      const contestant = data[0];
      const hasIsWinnerColumn = 'is_winner' in contestant;

      if (hasIsWinnerColumn) {
        console.log('  ✅ New column added: is_winner');
      } else {
        console.log('  ❌ Missing new column: is_winner');
        allTestsPassed = false;
      }
    } else {
      console.log('  ⚠️  No contestants exist to test columns');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 6: Verify episode_scores table has new columns
  console.log('\n✓ Test 6: episode_scores table new columns');
  try {
    const { data, error } = await supabase
      .from('episode_scores')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data.length > 0) {
      const score = data[0];
      const hasSourceColumn = 'source' in score;
      const hasCalculatedAtColumn = 'calculated_at' in score;

      if (hasSourceColumn && hasCalculatedAtColumn) {
        console.log('  ✅ New columns added: source, calculated_at');
        console.log(`  ✅ Default source value: ${score.source}`);
      } else {
        console.log('  ❌ Missing new columns');
        if (!hasSourceColumn) console.log('    - Missing: source');
        if (!hasCalculatedAtColumn) console.log('    - Missing: calculated_at');
        allTestsPassed = false;
      }
    } else {
      console.log('  ⚠️  No episode scores exist to test columns');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 7: Verify foreign key constraints
  console.log('\n✓ Test 7: Foreign key constraints');
  try {
    // Try to insert an invalid event (should fail)
    const { error } = await supabase
      .from('contestant_events')
      .insert({
        episode_id: 99999,
        contestant_id: 99999,
        event_type_id: 99999,
        point_value: 5
      });

    if (error) {
      console.log('  ✅ Foreign key constraints are working (invalid insert rejected)');
    } else {
      console.log('  ⚠️  Foreign key constraints may not be enforced');
    }
  } catch (error) {
    console.log('  ✅ Foreign key constraints are working');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('\n✅ ALL TESTS PASSED - Migration successful!\n');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Please review the migration\n');
    process.exit(1);
  }
}

// Run the tests
testMigration();
