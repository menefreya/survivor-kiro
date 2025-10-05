const supabase = require('../db/supabase');
const ScoreCalculationService = require('../services/scoreCalculationService');

/**
 * Get leaderboard with all players ranked by total score
 * @route GET /api/leaderboard
 * @access Protected
 */
async function getLeaderboard(req, res) {
  try {
    // Fetch all players with their profile information
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, email, profile_image_url, sole_survivor_id');

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    // Get the latest episode to calculate weekly changes
    const { data: latestEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .order('episode_number', { ascending: false })
      .limit(1)
      .single();

    // Build leaderboard data for each player
    const leaderboardData = [];

    for (const player of players) {
      // Fetch player's 2 draft picks
      const { data: draftPicks, error: draftError } = await supabase
        .from('draft_picks')
        .select(`
          contestant_id,
          contestants:contestant_id (
            id,
            name,
            profession,
            image_url,
            total_score,
            is_eliminated
          )
        `)
        .eq('player_id', player.id);

      if (draftError) {
        console.error('Error fetching draft picks:', draftError);
        continue;
      }

      // Fetch sole survivor contestant
      let soleSurvivor = null;
      if (player.sole_survivor_id) {
        const { data: soleSurvivorData, error: soleSurvivorError } = await supabase
          .from('contestants')
          .select('id, name, profession, image_url, total_score, is_eliminated')
          .eq('id', player.sole_survivor_id)
          .single();

        if (!soleSurvivorError && soleSurvivorData) {
          soleSurvivor = soleSurvivorData;
        }
      }

      // Extract contestant details from draft picks
      const draftedContestants = draftPicks
        .map(pick => pick.contestants)
        .filter(contestant => contestant !== null);

      // Use ScoreCalculationService to calculate player score with bonuses
      let playerScoreBreakdown;
      try {
        playerScoreBreakdown = await ScoreCalculationService.calculatePlayerScore(player.id);
      } catch (error) {
        console.error(`Error calculating score for player ${player.id}:`, error);
        // Fallback to basic calculation without bonuses
        playerScoreBreakdown = {
          draft_score: draftedContestants.reduce((sum, c) => sum + (c.total_score || 0), 0),
          sole_survivor_score: soleSurvivor ? (soleSurvivor.total_score || 0) : 0,
          sole_survivor_bonus: 0,
          total: 0
        };
        playerScoreBreakdown.total = playerScoreBreakdown.draft_score + 
                                      playerScoreBreakdown.sole_survivor_score;
      }

      // Calculate sole survivor bonus breakdown
      let bonusBreakdown = null;
      try {
        const bonus = await ScoreCalculationService.calculateSoleSurvivorBonus(player.id);
        if (bonus.totalBonus > 0) {
          bonusBreakdown = {
            episode_count: bonus.episodeCount,
            episode_bonus: bonus.episodeBonus,
            winner_bonus: bonus.winnerBonus,
            total_bonus: bonus.totalBonus
          };
        }
      } catch (error) {
        console.error(`Error calculating sole survivor bonus for player ${player.id}:`, error);
      }

      // Calculate weekly change (latest episode scores)
      let weeklyChange = 0;
      if (latestEpisode && !episodeError) {
        const allContestantIds = [
          ...draftedContestants.map(c => c.id),
          ...(soleSurvivor ? [soleSurvivor.id] : [])
        ];

        if (allContestantIds.length > 0) {
          const { data: episodeScores, error: scoresError } = await supabase
            .from('episode_scores')
            .select('contestant_id, score')
            .eq('episode_id', latestEpisode.id)
            .in('contestant_id', allContestantIds);

          if (!scoresError && episodeScores) {
            weeklyChange = episodeScores.reduce((sum, score) => sum + (score.score || 0), 0);
          }
        }
      }

      // Build player leaderboard entry
      leaderboardData.push({
        player_id: player.id,
        player_name: player.name,
        username: player.email.split('@')[0], // Extract username from email
        profile_image_url: player.profile_image_url,
        total_score: playerScoreBreakdown.total,
        draft_score: playerScoreBreakdown.draft_score,
        sole_survivor_score: playerScoreBreakdown.sole_survivor_score,
        sole_survivor_bonus: playerScoreBreakdown.sole_survivor_bonus,
        bonus_breakdown: bonusBreakdown,
        weekly_change: weeklyChange,
        drafted_contestants: draftedContestants,
        sole_survivor: soleSurvivor
      });
    }

    // Sort by total score (descending), then alphabetically by name for ties
    leaderboardData.sort((a, b) => {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return a.player_name.localeCompare(b.player_name);
    });

    res.json(leaderboardData);
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getLeaderboard
};
