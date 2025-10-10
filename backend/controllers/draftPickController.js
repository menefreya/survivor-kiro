const supabase = require('../db/supabase');
const ScoreCalculationService = require('../services/scoreCalculationService');

/**
 * Get score breakdown for a specific draft pick with episode range
 * @route GET /api/draft-picks/:pickId/score-breakdown
 * @access Protected
 */
async function getDraftPickScoreBreakdown(req, res) {
  try {
    const { pickId } = req.params;

    // Fetch draft pick with contestant and episode range
    const { data: draftPick, error: pickError } = await supabase
      .from('draft_picks')
      .select(`
        id,
        contestant_id,
        start_episode,
        end_episode,
        is_replacement,
        replaced_contestant_id,
        contestants:contestant_id (
          id,
          name,
          profession,
          image_url,
          total_score,
          is_eliminated,
          is_winner
        )
      `)
      .eq('id', pickId)
      .single();

    if (pickError) {
      return res.status(404).json({ error: 'Draft pick not found' });
    }

    // Calculate score for the episode range
    const rangeScore = await ScoreCalculationService.calculateContestantScoreForEpisodeRange(
      draftPick.contestant_id,
      draftPick.start_episode,
      draftPick.end_episode
    );

    // Get episode scores within the range for detailed breakdown
    let episodeQuery = supabase
      .from('episode_scores')
      .select(`
        score,
        episodes:episode_id (
          id,
          episode_number,
          is_current
        )
      `)
      .eq('contestant_id', draftPick.contestant_id)
      .gte('episodes.episode_number', draftPick.start_episode);

    if (draftPick.end_episode !== null) {
      episodeQuery = episodeQuery.lte('episodes.episode_number', draftPick.end_episode);
    }

    const { data: episodeScores, error: scoresError } = await episodeQuery
      .order('episodes.episode_number', { ascending: true });

    if (scoresError) {
      console.error('Error fetching episode scores:', scoresError);
      return res.status(500).json({ error: 'Failed to fetch episode scores' });
    }

    res.json({
      draft_pick: {
        id: draftPick.id,
        start_episode: draftPick.start_episode,
        end_episode: draftPick.end_episode,
        is_replacement: draftPick.is_replacement,
        replaced_contestant_id: draftPick.replaced_contestant_id,
        range_score: rangeScore
      },
      contestant: draftPick.contestants,
      episodes: episodeScores || []
    });
  } catch (error) {
    console.error('Error in getDraftPickScoreBreakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all draft picks for a player with score breakdowns
 * @route GET /api/players/:playerId/draft-picks-breakdown
 * @access Protected
 */
async function getPlayerDraftPicksBreakdown(req, res) {
  try {
    const { playerId } = req.params;

    // Verify player exists and user has access
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', playerId)
      .single();

    if (playerError) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check if user can access this player's data (own data or admin)
    if (req.user.id !== parseInt(playerId) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch all draft picks for the player
    const { data: draftPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select(`
        id,
        contestant_id,
        start_episode,
        end_episode,
        is_replacement,
        replaced_contestant_id,
        pick_number,
        contestants:contestant_id (
          id,
          name,
          profession,
          image_url,
          total_score,
          is_eliminated,
          is_winner
        )
      `)
      .eq('player_id', playerId)
      .order('start_episode', { ascending: true });

    if (picksError) {
      return res.status(500).json({ error: 'Failed to fetch draft picks' });
    }

    // Calculate score breakdown for each draft pick
    const draftPicksWithBreakdown = await Promise.all(
      draftPicks.map(async (pick) => {
        try {
          // Calculate score for the episode range
          const rangeScore = await ScoreCalculationService.calculateContestantScoreForEpisodeRange(
            pick.contestant_id,
            pick.start_episode,
            pick.end_episode
          );

          // Get episode scores within the range
          let episodeQuery = supabase
            .from('episode_scores')
            .select(`
              score,
              episodes:episode_id (
                id,
                episode_number,
                is_current
              )
            `)
            .eq('contestant_id', pick.contestant_id)
            .gte('episodes.episode_number', pick.start_episode);

          if (pick.end_episode !== null) {
            episodeQuery = episodeQuery.lte('episodes.episode_number', pick.end_episode);
          }

          const { data: episodeScores } = await episodeQuery
            .order('episodes.episode_number', { ascending: true });

          return {
            draft_pick: {
              id: pick.id,
              start_episode: pick.start_episode,
              end_episode: pick.end_episode,
              is_replacement: pick.is_replacement,
              replaced_contestant_id: pick.replaced_contestant_id,
              pick_number: pick.pick_number,
              range_score: rangeScore
            },
            contestant: pick.contestants,
            episodes: episodeScores || []
          };
        } catch (error) {
          console.error(`Error calculating breakdown for draft pick ${pick.id}:`, error);
          return {
            draft_pick: {
              id: pick.id,
              start_episode: pick.start_episode,
              end_episode: pick.end_episode,
              is_replacement: pick.is_replacement,
              replaced_contestant_id: pick.replaced_contestant_id,
              pick_number: pick.pick_number,
              range_score: 0
            },
            contestant: pick.contestants,
            episodes: []
          };
        }
      })
    );

    res.json({
      player: {
        id: player.id,
        name: player.name
      },
      draft_picks: draftPicksWithBreakdown
    });
  } catch (error) {
    console.error('Error in getPlayerDraftPicksBreakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getDraftPickScoreBreakdown,
  getPlayerDraftPicksBreakdown
};