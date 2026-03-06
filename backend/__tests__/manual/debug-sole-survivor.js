const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debug() {
  // Get all episodes
  const { data: allEpisodes } = await supabase
    .from('episodes')
    .select('id, episode_number')
    .order('episode_number');

  console.log('Episodes:', JSON.stringify(allEpisodes, null, 2));

  // Get sole survivor history for player 3
  const { data: soleSurvivorHistory } = await supabase
    .from('sole_survivor_history')
    .select('*, contestants(name)')
    .eq('player_id', 3)
    .order('start_episode');

  console.log('\n\nSole Survivor History for Player 3:');
  console.log(JSON.stringify(soleSurvivorHistory, null, 2));

  // Now simulate the logic for episodes 4, 5, 6, 7
  console.log('\n\n=== SIMULATING LOGIC ===');
  for (let episodeNum = 4; episodeNum <= 7; episodeNum++) {
    console.log(`\nEpisode ${episodeNum}:`);

    const activeSoleSurvivor = (soleSurvivorHistory || []).find(h => {
      const startEpisodeNumber = h.start_episode || 1;
      const endEpisodeNumber = h.end_episode;

      const isActive = startEpisodeNumber <= episodeNum &&
             (endEpisodeNumber === null || endEpisodeNumber >= episodeNum);

      console.log(`  ${h.contestants.name}: start=${startEpisodeNumber}, end=${endEpisodeNumber}, isActive=${isActive}`);

      return isActive;
    });

    console.log(`  Active Sole Survivor: ${activeSoleSurvivor ? activeSoleSurvivor.contestants.name : 'None'}`);
  }
}

debug();
