const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  // Get player 3's sole survivor history
  const { data: history, error } = await supabase
    .from('sole_survivor_history')
    .select('*')
    .eq('player_id', 3)
    .order('start_episode');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sole Survivor History for Player 3:');
    console.log(JSON.stringify(history, null, 2));
  }

  // Get contestant info for Rizo
  const { data: contestants } = await supabase
    .from('contestants')
    .select('id, name')
    .ilike('name', '%rizo%');

  console.log('\n\nRizo contestant info:');
  console.log(JSON.stringify(contestants, null, 2));

  // Also get all episodes to see episode IDs
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number')
    .order('episode_number');

  console.log('\n\nEpisode IDs:');
  console.log(JSON.stringify(episodes, null, 2));
}

check();
