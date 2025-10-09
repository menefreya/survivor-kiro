const supabase = require('../db/supabase');
const predictionScoringService = require('./predictionScoringService');

/**
 * Service for calculating scores based on events
 * Handles episode scores, contestant totals, sole survivor bonuses, and player scores
 */
class ScoreCalculationService {
  /**
   * Calculate episode score for a contestant based on events
   * @param {number} episodeId - Episode ID
   * @param {number} contestantId - Contestant ID
   * @returns {Promise<number>} Total score for the episode
   */
  async calculateEpisodeScore(episodeId, contestantId) {
    // Fetch all contestant_events for this episode and contestant
    const { data: events, error } = await supabase
      .from('contestant_events')
      .select('point_value')
      .eq('episode_id', episodeId)
      .eq('contestant_id', contestantId);

    if (error) {
      throw new Error(`Failed to fetch contestant events: ${error.message}`);
    }

    // Handle empty event list (return 0)
    if (!events || events.length === 0) {
      return 0;
    }

    // Sum point_value from all events
    const score = events.reduce((sum, event) => sum + event.point_value, 0);
    return score;
  }

  /**
   * Update contestant's total score by summing all episode scores
   * @param {number} contestantId - Contestant ID
   * @returns {Promise<number>} Updated total score
   */
  async updateContestantTotalScore(contestantId) {
    // Sum all episode_scores for this contestant
    const { data: episodeScores, error } = await supabase
      .from('episode_scores')
      .select('score')
      .eq('contestant_id', contestantId);

    if (error) {
      throw new Error(`Failed to fetch episode scores: ${error.message}`);
    }

    // Handle contestants with no scores
    const totalScore = episodeScores && episodeScores.length > 0
      ? episodeScores.reduce((sum, ep) => sum + (ep.score || 0), 0)
      : 0;

    // Update contestants.total_score
    const { error: updateError } = await supabase
      .from('contestants')
      .update({ total_score: totalScore })
      .eq('id', contestantId);

    if (updateError) {
      throw new Error(`Failed to update contestant total score: ${updateError.message}`);
    }

    return totalScore;
  }

  /**
   * Recalculate and update total scores for all contestants
   * @returns {Promise<void>}
   */
  async recalculateAllContestantScores() {
    // Get all contestant IDs
    const { data: contestants, error } = await supabase
      .from('contestants')
      .select('id');

    if (error) {
      throw new Error(`Failed to fetch contestants: ${error.message}`);
    }

    // Update each contestant's total score
    for (const contestant of contestants) {
      try {
        await this.updateContestantTotalScore(contestant.id);
      } catch (error) {
        console.error(`Error updating score for contestant ${contestant.id}:`, error);
      }
    }
  }

  /**
   * Calculate sole survivor bonus for a player
   * Awards +1 point per episode in current contiguous period
   * Awards +25 bonus if contestant wins and was selected by episode 2
   * @param {number} playerId - Player ID
   * @returns {Promise<{episodeBonus: number, winnerBonus: number, totalBonus: number, episodeCount: number}>}
   */
  async calculateSoleSurvivorBonus(playerId) {
    // Get current sole survivor selection from sole_survivor_history
    const { data: currentSelection, error: selectionError } = await supabase
      .from('sole_survivor_history')
      .select('contestant_id, start_episode')
      .eq('player_id', playerId)
      .is('end_episode', null)
      .maybeSingle();

    if (selectionError) {
      throw new Error(`Failed to fetch sole survivor history: ${selectionError.message}`);
    }

    // If no current selection, return 0
    if (!currentSelection) {
      return {
        episodeBonus: 0,
        winnerBonus: 0,
        totalBonus: 0,
        episodeCount: 0
      };
    }

    // Get current episode number
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('episode_number')
      .eq('is_current', true)
      .maybeSingle();

    if (episodeError) {
      throw new Error(`Failed to fetch current episode: ${episodeError.message}`);
    }

    // If no current episode is set, use the highest episode number
    let currentEpisodeNumber;
    if (!currentEpisode) {
      const { data: latestEpisode, error: latestError } = await supabase
        .from('episodes')
        .select('episode_number')
        .order('episode_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        throw new Error(`Failed to fetch latest episode: ${latestError.message}`);
      }

      currentEpisodeNumber = latestEpisode ? latestEpisode.episode_number : 1;
    } else {
      currentEpisodeNumber = currentEpisode.episode_number;
    }

    // Calculate episodes in contiguous period (current_episode - start_episode + 1)
    const episodeCount = currentEpisodeNumber - currentSelection.start_episode + 1;
    const episodeBonus = episodeCount * 1; // +1 point per episode

    // Check if contestant is winner and selected by episode 2
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('is_winner')
      .eq('id', currentSelection.contestant_id)
      .single();

    if (contestantError) {
      throw new Error(`Failed to fetch contestant: ${contestantError.message}`);
    }

    // Award +25 bonus if conditions met
    let winnerBonus = 0;
    if (contestant.is_winner && currentSelection.start_episode <= 2) {
      winnerBonus = 25;
    }

    return {
      episodeBonus,
      winnerBonus,
      totalBonus: episodeBonus + winnerBonus,
      episodeCount
    };
  }

  /**
   * Calculate total player score including draft picks, sole survivor bonuses, and prediction bonus
   * @param {number} playerId - Player ID
   * @returns {Promise<{draft_score: number, sole_survivor_score: number, sole_survivor_bonus: number, prediction_bonus: number, total: number}>}
   */
  async calculatePlayerScore(playerId) {
    // Get draft picks and sum contestant scores
    const { data: draftPicks, error: draftError } = await supabase
      .from('draft_picks')
      .select('contestant_id, contestants(total_score)')
      .eq('player_id', playerId);

    if (draftError) {
      throw new Error(`Failed to fetch draft picks: ${draftError.message}`);
    }

    const draftScore = draftPicks && draftPicks.length > 0
      ? draftPicks.reduce((sum, pick) => sum + (pick.contestants?.total_score || 0), 0)
      : 0;

    // Get sole survivor and add contestant score
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('sole_survivor_id, contestants(total_score)')
      .eq('id', playerId)
      .single();

    if (playerError) {
      throw new Error(`Failed to fetch player: ${playerError.message}`);
    }

    const soleSurvivorScore = player.contestants?.total_score || 0;

    // Calculate and add sole survivor bonus
    const bonusBreakdown = await this.calculateSoleSurvivorBonus(playerId);
    const soleSurvivorBonus = bonusBreakdown.totalBonus;

    // Calculate and add prediction bonus
    const predictionBonus = await predictionScoringService.getPredictionBonus(playerId);

    return {
      draft_score: draftScore,
      sole_survivor_score: soleSurvivorScore,
      sole_survivor_bonus: soleSurvivorBonus,
      prediction_bonus: predictionBonus,
      total: draftScore + soleSurvivorScore + soleSurvivorBonus + predictionBonus
    };
  }
}

module.exports = new ScoreCalculationService();

