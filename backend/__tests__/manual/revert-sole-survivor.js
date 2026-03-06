const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function revert() {
  // Revert Rizo's start_episode back to 7 (episode number)
  const { data: updated, error } = await supabase
    .from('sole_survivor_history')
    .update({ start_episode: 7 })
    .eq('player_id', 3)
    .eq('contestant_id', 12)
    .select();

  if (error) {
    console.error('Error reverting:', error);
  } else {
    console.log('Reverted records:', updated);
  }

  // Verify the revert
  const { data: verify } = await supabase
    .from('sole_survivor_history')
    .select('*')
    .eq('player_id', 3);

  console.log('\nAll sole survivor history for player 3:', JSON.stringify(verify, null, 2));
}

revert();
