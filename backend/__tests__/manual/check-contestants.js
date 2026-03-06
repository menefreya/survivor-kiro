const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  // Get contestant info
  const { data: contestants } = await supabase
    .from('contestants')
    .select('id, name')
    .in('id', [12, 15]);

  console.log('Contestants:');
  console.log(JSON.stringify(contestants, null, 2));

  // Check if there's any issue with the sole_survivor_history query in the controller
  const { data: history, error } = await supabase
    .from('sole_survivor_history')
    .select(`
      contestant_id,
      start_episode,
      end_episode,
      contestants:contestant_id (
        id,
        name,
        image_url,
        is_eliminated
      )
    `)
    .eq('player_id', 3)
    .order('start_episode');

  console.log('\n\nSole Survivor History (as fetched by controller):');
  if (error) {
    console.log('Error:', error);
  }
  console.log(JSON.stringify(history, null, 2));
}

check();
