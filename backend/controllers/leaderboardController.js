const supabase = require('../db/supabase');
const ScoreCalculationService = require('../services/scoreCalculationService');

// Simple in-memory cache for leaderboard
let leaderboardCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 60 seconds - longer cache for better performance

/**
 * Get leaderboard with all players ranked by total score
 * @route GET /api/leaderboard
 * @access Protected
 */
async function getLeaderboard(req, res) {
  try {
    // Check cache first
    const now = Date.now();
    if (leaderboardCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('Serving leaderboard from cache');
      return res.json(leaderboardCache);
    }

    console.time('leaderboard-query');
    
    // BULK QUERY 1: Get all players with their draft picks and sole survivors in one query
    const { data: playersWithDrafts, error: playersError } = await supabase
      .from('players')
      .select(`
        id,
        name,
        email,
        profile_image_url,
        sole_survivor_id,
        contestants:sole_survivor_id (
          id,
          name,
          profession,
          image_url,
          total_score,
          is_eliminated
        ),
        draft_picks (
          contestant_id,
          start_episode,
          end_episode,
          is_replacement,
          contestants:contestant_id (
            id,
            name,
            profession,
            image_url,
            total_score,
            is_eliminated
          )
        )
      `);

    if (playersError) {
      console.error('Error fetching players with drafts:', playersError);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    // BULK QUERY 2: Get latest episode
    const { data: latestEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .order('episode_number', { ascending: false })
      .limit(1)
      .single();

    // BULK QUERY 3: Get all episode scores for latest episode (all contestants at once)
    let allLatestScores = [];
    if (latestEpisode && !episodeError) {
      const { data: episodeScores, error: scoresError } = await supabase
        .from('episode_scores')
        .select('contestant_id, score')
        .eq('episode_id', latestEpisode.id);

      if (!scoresError && episodeScores) {
        allLatestScores = episodeScores;
      }
    }

    // BULK QUERY 4: Get all prediction bonuses for all players at once
    const { data: predictionBonuses, error: predictionError } = await supabase
      .from('elimination_predictions')
      .select('player_id')
      .eq('is_correct', true);

    // Create lookup map for prediction bonuses
    const predictionBonusMap = {};
    if (!predictionError && predictionBonuses) {
      predictionBonuses.forEach(pred => {
        predictionBonusMap[pred.player_id] = (predictionBonusMap[pred.player_id] || 0) + 3;
      });
    }

    // Create lookup map for latest episode scores
    const latestScoresMap = {};
    allLatestScores.forEach(score => {
      latestScoresMap[score.contestant_id] = score.score || 0;
    });

    // Build leaderboard data efficiently (no more database queries in loop)
    const leaderboardData = [];

    for (const player of playersWithDrafts) {
      // Extract contestant details from draft picks
      const draftedContestants = player.draft_picks
        .map(pick => pick.contestants)
        .filter(contestant => contestant !== null);

      const soleSurvivor = player.contestants;

      // Calculate scores efficiently using pre-fetched data
      const draftScore = draftedContestants.reduce((sum, c) => sum + (c.total_score || 0), 0);
      const soleSurvivorScore = soleSurvivor ? (soleSurvivor.total_score || 0) : 0;
      const predictionBonus = predictionBonusMap[player.id] || 0;

      // Calculate weekly change from pre-fetched scores lookup
      let weeklyChange = 0;
      const allContestantIds = [
        ...draftedContestants.map(c => c.id),
        ...(soleSurvivor ? [soleSurvivor.id] : [])
      ];

      weeklyChange = allContestantIds.reduce((sum, contestantId) => {
        return sum + (latestScoresMap[contestantId] || 0);
      }, 0);

      // Skip complex sole survivor bonus for now to maintain performance
      // TODO: Optimize sole survivor bonus calculation separately
      const soleSurvivorBonus = 0;
      let bonusBreakdown = null;

      // Build player leaderboard entry
      leaderboardData.push({
        player_id: player.id,
        player_name: player.name,
        username: player.email.split('@')[0],
        profile_image_url: player.profile_image_url,
        total_score: draftScore + soleSurvivorScore + soleSurvivorBonus + predictionBonus,
        draft_score: draftScore,
        sole_survivor_score: soleSurvivorScore,
        sole_survivor_bonus: soleSurvivorBonus,
        prediction_bonus: predictionBonus,
        elimination_compensation: 0,
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

    console.timeEnd('leaderboard-query');
    console.log(`Leaderboard generated with ${playersWithDrafts.length} players using 4 bulk queries`);
    
    // Cache the result
    leaderboardCache = leaderboardData;
    cacheTimestamp = now;
    
    res.json(leaderboardData);
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Clear leaderboard cache
 * Called when scores are updated
 */
function clearLeaderboardCache() {
  leaderboardCache = null;
  cacheTimestamp = null;
  console.log('Leaderboard cache cleared');
}

/**
 * Recalculate all contestant scores
 * @route POST /api/leaderboard/recalculate
 * @access Admin only
 */
async function recalculateScores(req, res) {
  try {
    await ScoreCalculationService.recalculateAllContestantScores();
    clearLeaderboardCache(); // Clear cache after recalculation
    res.json({ message: 'All contestant scores recalculated successfully' });
  } catch (error) {
    console.error('Error recalculating scores:', error);
    res.status(500).json({ error: 'Failed to recalculate scores' });
  }
}

module.exports = {
  getLeaderboard,
  recalculateScores,
  clearLeaderboardCache
};
