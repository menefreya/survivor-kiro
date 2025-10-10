const supabase = require('../db/supabase');

/**
 * Save player rankings
 * @route POST /api/rankings
 * @access Protected
 */
async function saveRankings(req, res) {
  try {
    const { rankings, sole_survivor_id } = req.body;
    const playerId = req.user.id;

    // Validate required fields
    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      return res.status(400).json({ error: 'Rankings array is required' });
    }

    if (!sole_survivor_id) {
      return res.status(400).json({ error: 'Sole survivor pick is required' });
    }

    // Get all contestants to validate rankings
    const { data: contestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('id');

    if (contestantsError) {
      console.error('Error fetching contestants:', contestantsError);
      return res.status(500).json({ error: 'Failed to fetch contestants' });
    }

    const contestantIds = contestants.map(c => c.id);

    // Validate that all contestants are ranked
    const rankedContestantIds = rankings.map(r => r.contestant_id);
    const allContestantsRanked = contestantIds.every(id => rankedContestantIds.includes(id));
    
    if (!allContestantsRanked) {
      return res.status(400).json({ error: 'All contestants must be ranked' });
    }

    // Validate no duplicate contestants
    const uniqueRankedIds = new Set(rankedContestantIds);
    if (uniqueRankedIds.size !== rankedContestantIds.length) {
      return res.status(400).json({ error: 'Duplicate contestants in rankings' });
    }

    // Validate sole survivor is a valid contestant
    if (!contestantIds.includes(sole_survivor_id)) {
      return res.status(400).json({ error: 'Invalid sole survivor contestant' });
    }

    // Check if player has already submitted rankings
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('has_submitted_rankings')
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return res.status(500).json({ error: 'Failed to fetch player data' });
    }

    if (player.has_submitted_rankings) {
      return res.status(400).json({ error: 'Rankings already submitted' });
    }

    // Delete any existing rankings for this player (in case of partial submission)
    const { error: deleteError } = await supabase
      .from('rankings')
      .delete()
      .eq('player_id', playerId);

    if (deleteError) {
      console.error('Error deleting old rankings:', deleteError);
      return res.status(500).json({ error: 'Failed to clear old rankings' });
    }

    // Prepare rankings data for insertion
    const rankingsData = rankings.map((ranking, index) => ({
      player_id: playerId,
      contestant_id: ranking.contestant_id,
      rank: ranking.rank !== undefined ? ranking.rank : index + 1
    }));

    // Insert new rankings
    const { error: insertError } = await supabase
      .from('rankings')
      .insert(rankingsData);

    if (insertError) {
      console.error('Error inserting rankings:', insertError);
      return res.status(500).json({ error: 'Failed to save rankings' });
    }

    // Get current episode number (find the episode marked as is_current)
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('episode_number')
      .eq('is_current', true)
      .single();

    // Default to episode 1 if no current episode is set
    const currentEpisodeNumber = currentEpisode?.episode_number || 1;

    // Create initial sole survivor history record
    const { error: historyError } = await supabase
      .from('sole_survivor_history')
      .insert({
        player_id: playerId,
        contestant_id: sole_survivor_id,
        start_episode: currentEpisodeNumber,
        end_episode: null
      });

    if (historyError) {
      console.error('Error creating sole survivor history:', historyError);
      return res.status(500).json({ error: 'Failed to create sole survivor history' });
    }

    // Update player's has_submitted_rankings flag and sole_survivor_id
    const { error: updateError } = await supabase
      .from('players')
      .update({
        has_submitted_rankings: true,
        sole_survivor_id: sole_survivor_id
      })
      .eq('id', playerId);

    if (updateError) {
      console.error('Error updating player:', updateError);
      return res.status(500).json({ error: 'Failed to update player status' });
    }

    res.status(201).json({
      message: 'Rankings submitted successfully',
      player_id: playerId,
      rankings_count: rankingsData.length,
      sole_survivor_id: sole_survivor_id
    });
  } catch (error) {
    console.error('Error in saveRankings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get player's rankings
 * @route GET /api/rankings/:playerId
 * @access Protected
 */
async function getPlayerRankings(req, res) {
  try {
    const { playerId } = req.params;

    // Validate playerId is a number
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    // Fetch rankings with contestant details
    const { data: rankings, error: rankingsError } = await supabase
      .from('rankings')
      .select(`
        id,
        rank,
        contestant_id,
        contestants (
          id,
          name,
          profession,
          image_url,
          total_score,
          is_eliminated
        )
      `)
      .eq('player_id', playerId)
      .order('rank', { ascending: true });

    if (rankingsError) {
      console.error('Error fetching rankings:', rankingsError);
      return res.status(500).json({ error: 'Failed to fetch rankings' });
    }

    // Fetch player's sole survivor pick
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        id,
        name,
        has_submitted_rankings,
        sole_survivor_id,
        contestants (
          id,
          name,
          profession,
          image_url,
          total_score,
          is_eliminated
        )
      `)
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      player_id: parseInt(playerId),
      player_name: player.name,
      has_submitted_rankings: player.has_submitted_rankings,
      rankings: rankings,
      sole_survivor: player.contestants
    });
  } catch (error) {
    console.error('Error in getPlayerRankings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  saveRankings,
  getPlayerRankings
};
