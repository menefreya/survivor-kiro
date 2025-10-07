const supabase = require('../db/supabase');

/**
 * Calculate performance trend for a contestant based on their episode scores
 * @param {number} contestantId - The contestant's ID
 * @param {Array} episodeScores - Array of episode scores sorted by episode number
 * @returns {string} - 'up', 'down', 'same', or 'n/a'
 */
function calculatePerformanceTrend(contestantId, episodeScores) {
  const episodeCount = episodeScores.length;
  
  // For <3 episodes: Return "N/A" trend
  if (episodeCount < 3) {
    return 'n/a';
  }
  
  // For 3-5 episodes: Compare last episode vs previous 2 episodes average
  if (episodeCount >= 3 && episodeCount <= 5) {
    const lastEpisodeScore = episodeScores[episodeCount - 1].score;
    const previous2Episodes = episodeScores.slice(episodeCount - 3, episodeCount - 1);
    const previous2Average = previous2Episodes.reduce((sum, ep) => sum + ep.score, 0) / previous2Episodes.length;
    
    // Apply 5% threshold for "same" trend classification
    const percentChange = ((lastEpisodeScore - previous2Average) / previous2Average) * 100;
    
    if (Math.abs(percentChange) <= 5) {
      return 'same';
    } else if (lastEpisodeScore > previous2Average) {
      return 'up';
    } else {
      return 'down';
    }
  }
  
  // For 6+ episodes: Compare recent 3 episodes average vs previous 3 episodes average
  if (episodeCount >= 6) {
    // Get the last 6 episodes
    const last6Episodes = episodeScores.slice(-6);
    
    // Calculate averages for previous 3 vs recent 3
    const previous3Episodes = last6Episodes.slice(0, 3);
    const recent3Episodes = last6Episodes.slice(3, 6);
    
    const previous3Average = previous3Episodes.reduce((sum, ep) => sum + ep.score, 0) / 3;
    const recent3Average = recent3Episodes.reduce((sum, ep) => sum + ep.score, 0) / 3;
    
    // Apply 5% threshold for "same" trend classification
    const percentChange = ((recent3Average - previous3Average) / previous3Average) * 100;
    
    if (Math.abs(percentChange) <= 5) {
      return 'same';
    } else if (recent3Average > previous3Average) {
      return 'up';
    } else {
      return 'down';
    }
  }
  
  // Fallback (should not reach here)
  return 'n/a';
}

/**
 * Get episode scores for a specific contestant, sorted by episode number
 * @param {number} contestantId - The contestant's ID
 * @returns {Array} - Array of episode scores with episode numbers
 */
async function getContestantEpisodeScores(contestantId) {
  try {
    const { data: episodeScores, error } = await supabase
      .from('episode_scores')
      .select(`
        score,
        episodes!inner(
          id,
          episode_number
        )
      `)
      .eq('contestant_id', contestantId)
      .order('episodes(episode_number)', { ascending: true });

    if (error) {
      console.error(`Error fetching episode scores for contestant ${contestantId}:`, error);
      throw error;
    }

    // Transform the data to a simpler format
    return (episodeScores || []).map(score => ({
      episode_number: score.episodes.episode_number,
      score: score.score
    }));
  } catch (error) {
    console.error(`Error in getContestantEpisodeScores for contestant ${contestantId}:`, error);
    throw error;
  }
}

/**
 * Calculate performance trend for a contestant by fetching their episode scores
 * @param {number} contestantId - The contestant's ID
 * @returns {string} - 'up', 'down', 'same', or 'n/a'
 */
async function calculateContestantTrend(contestantId) {
  try {
    const episodeScores = await getContestantEpisodeScores(contestantId);
    return calculatePerformanceTrend(contestantId, episodeScores);
  } catch (error) {
    console.error(`Error calculating trend for contestant ${contestantId}:`, error);
    // Return 'n/a' if there's an error fetching data
    return 'n/a';
  }
}

/**
 * Calculate performance trends for multiple contestants efficiently
 * @param {Array} contestantIds - Array of contestant IDs
 * @returns {Object} - Object mapping contestant ID to trend
 */
async function calculateMultipleContestantTrends(contestantIds) {
  try {
    // Fetch all episode scores for all contestants in one query
    const { data: allEpisodeScores, error } = await supabase
      .from('episode_scores')
      .select(`
        contestant_id,
        score,
        episodes!inner(
          id,
          episode_number
        )
      `)
      .in('contestant_id', contestantIds)
      .order('episodes(episode_number)', { ascending: true });

    if (error) {
      console.error('Error fetching episode scores for multiple contestants:', error);
      throw error;
    }

    // Group episode scores by contestant
    const scoresByContestant = {};
    (allEpisodeScores || []).forEach(score => {
      if (!scoresByContestant[score.contestant_id]) {
        scoresByContestant[score.contestant_id] = [];
      }
      scoresByContestant[score.contestant_id].push({
        episode_number: score.episodes.episode_number,
        score: score.score
      });
    });

    // Calculate trends for each contestant
    const trends = {};
    contestantIds.forEach(contestantId => {
      const episodeScores = scoresByContestant[contestantId] || [];
      trends[contestantId] = calculatePerformanceTrend(contestantId, episodeScores);
    });

    return trends;
  } catch (error) {
    console.error('Error calculating multiple contestant trends:', error);
    // Return 'n/a' for all contestants if there's an error
    const trends = {};
    contestantIds.forEach(contestantId => {
      trends[contestantId] = 'n/a';
    });
    return trends;
  }
}

module.exports = {
  calculatePerformanceTrend,
  getContestantEpisodeScores,
  calculateContestantTrend,
  calculateMultipleContestantTrends
};