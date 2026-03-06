const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fix() {
  // Get episode 7's ID
  const { data: episode7 } = await supabase
    .from('episodes')
    .select('id, episode_number')
    .eq('episode_number', 7)
    .single();

  console.log('Episode 7 info:', episode7);

  if (!episode7) {
    console.log('Episode 7 not found!');
    return;
  }

  // Update the sole survivor history record for player 3, Rizo
  const { data: updated, error } = await supabase
    .from('sole_survivor_history')
    .update({ start_episode: episode7.id })
    .eq('player_id', 3)
    .eq('contestant_id', 12)
    .eq('start_episode', 7)
    .select();

  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('Updated records:', updated);
  }

  // Verify the update
  const { data: verify } = await supabase
    .from('sole_survivor_history')
    .select('*')
    .eq('player_id', 3)
    .eq('contestant_id', 12);

  console.log('\nVerification - Rizo record after update:', verify);
}

fix();
