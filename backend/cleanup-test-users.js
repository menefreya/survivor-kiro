const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Cleanup script to delete test users created during E2E testing
 * Deletes users with emails matching test patterns:
 * - test-auth-*@example.com
 * - admin-*@example.com
 * - player*-*@example.com
 * - admin-ss-*@example.com
 * - player-ss-*@example.com
 */
async function cleanupTestUsers() {
  console.log('🧹 Starting test user cleanup...\n');

  try {
    // Patterns to match test user emails
    const testEmailPatterns = [
      'test-auth-%@example.com',
      'admin-%@example.com',
      'player1-%@example.com',
      'player2-%@example.com',
      'admin-ss-%@example.com',
      'player-ss-%@example.com'
    ];

    let totalDeleted = 0;

    // Find all test users
    const { data: testUsers, error: fetchError } = await supabase
      .from('players')
      .select('id, email, name, created_at')
      .or(testEmailPatterns.map(pattern => `email.like.${pattern}`).join(','));

    if (fetchError) {
      throw fetchError;
    }

    if (!testUsers || testUsers.length === 0) {
      console.log('✓ No test users found. Database is clean!');
      return;
    }

    console.log(`Found ${testUsers.length} test user(s):\n`);
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Created: ${new Date(user.created_at).toLocaleString()}`);
    });

    console.log('\n🗑️  Deleting test users and their related data...\n');

    // Delete each test user (CASCADE will handle rankings and draft_picks)
    for (const user of testUsers) {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        console.error(`✗ Failed to delete ${user.email}:`, deleteError.message);
      } else {
        console.log(`✓ Deleted: ${user.email}`);
        totalDeleted++;
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} test user(s).`);
    console.log('   Related data (rankings, draft_picks) were automatically removed via CASCADE.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupTestUsers()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
