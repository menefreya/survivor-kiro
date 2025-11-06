const supabase = require('../db/supabase');
const ScoreCalculationService = require('../services/scoreCalculationService');

// Simple in-memory cache for leaderboard
let leaderboardCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 60 seconds - longer cache for better performance

// Clear cache immediately for debugging
leaderboardCache = null;
cacheTimestamp = null;

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
    
    // BULK QUERY 1: Get all players with their draft picks and sole survivor history in one query
    const { data: playersWithDrafts, error: playersError } = await supabase
      .from('players')
      .select(`
        id,
        name,
        email,
        profile_image_url,
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
        ),
        sole_survivor_history (
          contestant_id,
          start_episode,
          end_episode,
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

    // BULK QUERY 2: Get all episodes with their numbers and aired dates for range calculation
    const { data: allEpisodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, episode_number, aired_date')
      .order('episode_number', { ascending: true });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    // Find latest aired episode (most recent by aired_date)
    const latestEpisode = allEpisodes && allEpisodes.length > 0
      ? allEpisodes
          .filter(ep => ep.aired_date !== null && new Date(ep.aired_date) <= new Date())
          .sort((a, b) => new Date(b.aired_date) - new Date(a.aired_date))[0]
      : null;

    if (!latestEpisode) {
      console.log('No aired episodes found for leaderboard calculation');
    }

    // BULK QUERY 3: Get ALL episode scores for all contestants (we'll filter by range later)
    const { data: allEpisodeScores, error: allScoresError } = await supabase
      .from('episode_scores')
      .select('episode_id, contestant_id, score');

    if (allScoresError) {
      console.error('Error fetching episode scores:', allScoresError);
      return res.status(500).json({ error: 'Failed to fetch episode scores' });
    }

    // Create lookup map: contestant_id -> episode_id -> score
    const scoresLookup = {};
    (allEpisodeScores || []).forEach(score => {
      if (!scoresLookup[score.contestant_id]) {
        scoresLookup[score.contestant_id] = {};
      }
      scoresLookup[score.contestant_id][score.episode_id] = score.score || 0;
    });

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

    // BULK QUERY 5: Get correct predictions for ONLY the latest episode (for bullseye display)
    const latestEpisodeCorrectPredictions = {};
    if (latestEpisode) {
      const { data: latestEpisodePredictions, error: latestPredictionError } = await supabase
        .from('elimination_predictions')
        .select('player_id')
        .eq('episode_id', latestEpisode.id)
        .eq('is_correct', true);

      if (!latestPredictionError && latestEpisodePredictions) {
        latestEpisodePredictions.forEach(pred => {
          latestEpisodeCorrectPredictions[pred.player_id] = true;
        });
      }
    }

    // Helper function to calculate score for a contestant in an episode range using episode IDs
    // Used for draft picks which store start_episode and end_episode as episode IDs
    const calculateScoreForRangeByIds = (contestantId, startEpisodeId, endEpisodeId) => {
      if (!scoresLookup[contestantId]) return 0;

      const contestantScores = scoresLookup[contestantId];
      let totalScore = 0;

      // Find the episode numbers for these IDs
      const startEpisode = allEpisodes.find(ep => ep.id === startEpisodeId);
      const endEpisode = endEpisodeId ? allEpisodes.find(ep => ep.id === endEpisodeId) : null;

      if (!startEpisode) return 0;

      const startNumber = startEpisode.episode_number;
      const endNumber = endEpisode ? endEpisode.episode_number : null;

      // Sum scores for all episodes in the range
      for (const episode of allEpisodes) {
        if (episode.episode_number >= startNumber &&
            (endNumber === null || episode.episode_number <= endNumber)) {
          totalScore += contestantScores[episode.id] || 0;
        }
      }

      return totalScore;
    };

    // Helper function to calculate score for a contestant in an episode range using episode numbers
    // Used for legacy compatibility or when working with episode numbers directly
    const calculateScoreForRangeByNumbers = (contestantId, startEpisodeNumber, endEpisodeNumber) => {
      if (!scoresLookup[contestantId]) return 0;

      const contestantScores = scoresLookup[contestantId];
      let totalScore = 0;

      // Sum scores for all episodes in the range
      for (const episode of allEpisodes) {
        if (episode.episode_number >= startEpisodeNumber &&
            (endEpisodeNumber === null || episode.episode_number <= endEpisodeNumber)) {
          totalScore += contestantScores[episode.id] || 0;
        }
      }

      return totalScore;
    };

    // Build leaderboard data efficiently (no more database queries in loop)
    const leaderboardData = [];

    for (const player of playersWithDrafts) {
      // Calculate draft score based on episode ranges for each pick
      let draftScore = 0;
      const activeDraftContestants = [];

      // Debug logging for player ID 3
      if (player.id === 3) {
        console.log('=== LEADERBOARD DEBUG: Player ID 3 ===');
        console.log('Player:', player.name);
        console.log('Draft picks:', player.draft_picks?.map(p => ({
          contestant_id: p.contestant_id,
          contestant_name: p.contestants?.name,
          start_episode: p.start_episode,
          end_episode: p.end_episode
        })));
      }

      for (const pick of player.draft_picks || []) {
        if (!pick.contestants) continue;

        // Calculate score for this pick's episode range
        // Draft picks use episode IDs for start_episode and end_episode
        const pickScore = calculateScoreForRangeByIds(
          pick.contestant_id,
          pick.start_episode,
          pick.end_episode
        );

        if (player.id === 3) {
          console.log(`Draft pick ${pick.contestants.name}: start_id=${pick.start_episode}, end_id=${pick.end_episode}, score=${pickScore}`);
        }

        draftScore += pickScore;

        // Only include in active contestants if end_episode is null
        if (pick.end_episode === null) {
          activeDraftContestants.push({
            ...pick.contestants,
            // total_score already comes from contestants table (season total)
            // pickScore is what this contestant earned for this player
          });
        }
      }

      // Calculate sole survivor score based on history episode ranges
      let soleSurvivorScore = 0;
      let currentSoleSurvivor = null;

      if (player.id === 3) {
        console.log('Sole survivor history:', player.sole_survivor_history?.map(h => ({
          contestant_id: h.contestant_id,
          contestant_name: h.contestants?.name,
          start_episode: h.start_episode,
          end_episode: h.end_episode
        })));
      }

      for (const history of player.sole_survivor_history || []) {
        if (!history.contestants) continue;

        // Calculate score for this sole survivor period
        // Sole survivor history uses episode IDs for start_episode and end_episode (consistent with draft picks)
        const periodScore = calculateScoreForRangeByIds(
          history.contestant_id,
          history.start_episode,
          history.end_episode
        );

        if (player.id === 3) {
          console.log(`Sole survivor ${history.contestants.name}: start_num=${history.start_episode}, end_num=${history.end_episode}, score=${periodScore}`);
        }

        soleSurvivorScore += periodScore;

        // Track current sole survivor (end_episode is null)
        if (history.end_episode === null) {
          currentSoleSurvivor = {
            ...history.contestants,
            // total_score already comes from contestants table (season total)
            // periodScore is what this contestant earned for this player
          };
        }
      }

      const predictionBonus = predictionBonusMap[player.id] || 0;
      const currentEpisodePredictionBonus = latestEpisodeCorrectPredictions[player.id] ? 3 : 0;

      if (player.id === 3) {
        console.log(`TOTALS: draft=${draftScore}, soleSurvivor=${soleSurvivorScore}, prediction=${predictionBonus}`);
        console.log(`Current episode prediction bonus: ${currentEpisodePredictionBonus}`);
        console.log(`FINAL TOTAL: ${draftScore + soleSurvivorScore + predictionBonus}`);
        console.log('=================================');
      }

      // Calculate weekly change from latest episode only
      let weeklyChange = 0;
      if (latestEpisode) {
        // Sum scores from all active picks for latest episode
        for (const pick of player.draft_picks || []) {
          if (!pick.contestants) continue;
          const pickScores = scoresLookup[pick.contestant_id];
          if (pickScores && pickScores[latestEpisode.id]) {
            // Only count if this pick was active during latest episode
            // Draft picks store episode IDs, so convert to numbers for comparison
            const startEp = allEpisodes.find(ep => ep.id === pick.start_episode);
            const endEp = pick.end_episode ? allEpisodes.find(ep => ep.id === pick.end_episode) : null;

            if (startEp && startEp.episode_number <= latestEpisode.episode_number &&
                (pick.end_episode === null || (endEp && endEp.episode_number >= latestEpisode.episode_number))) {
              weeklyChange += pickScores[latestEpisode.id];
            }
          }
        }

        // Add sole survivor score for latest episode
        for (const history of player.sole_survivor_history || []) {
          if (!history.contestants) continue;
          const ssScores = scoresLookup[history.contestant_id];
          if (ssScores && ssScores[latestEpisode.id]) {
            // Only count if this sole survivor was active during latest episode
            // Sole survivor history stores episode NUMBERS
            if (history.start_episode <= latestEpisode.episode_number &&
                (history.end_episode === null || history.end_episode >= latestEpisode.episode_number)) {
              weeklyChange += ssScores[latestEpisode.id];
            }
          }
        }

        // Add current episode prediction bonus to weekly change if applicable
        weeklyChange += currentEpisodePredictionBonus;
      }

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
        current_episode_prediction_bonus: currentEpisodePredictionBonus,
        elimination_compensation: 0,
        bonus_breakdown: bonusBreakdown,
        weekly_change: weeklyChange,
        drafted_contestants: activeDraftContestants,
        sole_survivor: currentSoleSurvivor
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
