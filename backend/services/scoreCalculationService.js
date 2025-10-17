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
   * Calculate contestant score for a specific episode range (by episode number)
   * @param {number} contestantId - Contestant ID
   * @param {number} startEpisodeNumber - Start episode number
   * @param {number|null} endEpisodeNumber - End episode number (null for ongoing)
   * @returns {Promise<number>} Total score for the episode range
   */
  async calculateContestantScoreForEpisodeRangeByNumber(contestantId, startEpisodeNumber, endEpisodeNumber) {
    // Get episode scores directly using episode numbers
    let query = supabase
      .from('episode_scores')
      .select('score, episodes!inner(episode_number)')
      .eq('contestant_id', contestantId)
      .gte('episodes.episode_number', startEpisodeNumber);

    // Add end episode filter if specified
    if (endEpisodeNumber !== null) {
      query = query.lte('episodes.episode_number', endEpisodeNumber);
    }

    const { data: scores, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch episode scores: ${error.message}`);
    }

    // Sum up all scores in the range
    const totalScore = scores ? scores.reduce((sum, scoreRecord) => sum + scoreRecord.score, 0) : 0;
    return totalScore;
  }

  /**
   * Calculate contestant score for a specific episode range (for draft picks)
   * @param {number} contestantId - Contestant ID
   * @param {number} startEpisodeId - Starting episode ID (foreign key to episodes table)
   * @param {number|null} endEpisodeId - Ending episode ID (foreign key to episodes table, null means current)
   * @returns {Promise<number>} Total score for the episode range
   */
  async calculateContestantScoreForEpisodeRange(contestantId, startEpisodeId, endEpisodeId) {
    // First, get the episode numbers for the start and end episode IDs
    const { data: startEpisode, error: startError } = await supabase
      .from('episodes')
      .select('episode_number')
      .eq('id', startEpisodeId)
      .single();

    if (startError) {
      throw new Error(`Failed to fetch start episode: ${startError.message}`);
    }

    let endEpisodeNumber = null;
    if (endEpisodeId !== null) {
      const { data: endEpisode, error: endError } = await supabase
        .from('episodes')
        .select('episode_number')
        .eq('id', endEpisodeId)
        .single();

      if (endError) {
        throw new Error(`Failed to fetch end episode: ${endError.message}`);
      }
      endEpisodeNumber = endEpisode.episode_number;
    }

    // Build episode filter based on episode numbers
    let episodeQuery = supabase
      .from('episode_scores')
      .select('score, episodes!inner(episode_number)')
      .eq('contestant_id', contestantId)
      .gte('episodes.episode_number', startEpisode.episode_number);

    // Add end episode filter if specified
    if (endEpisodeNumber !== null) {
      episodeQuery = episodeQuery.lte('episodes.episode_number', endEpisodeNumber);
    }

    const { data: episodeScores, error } = await episodeQuery;

    if (error) {
      throw new Error(`Failed to fetch episode scores for range: ${error.message}`);
    }

    // Sum scores for the episode range
    const totalScore = episodeScores && episodeScores.length > 0
      ? episodeScores.reduce((sum, ep) => sum + (ep.score || 0), 0)
      : 0;

    return totalScore;
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
   * Awards +50 bonus if contestant wins and was selected by episode 2
   * Awards +10 bonus if contestant makes final 3 and was selected before episode 2
   * @param {number} playerId - Player ID
   * @returns {Promise<{episodeBonus: number, winnerBonus: number, finalThreeBonus: number, totalBonus: number, episodeCount: number}>}
   */
  async calculateSoleSurvivorBonus(playerId) {
    // Get all sole survivor selections from history
    const { data: allSelections, error: selectionError } = await supabase
      .from('sole_survivor_history')
      .select('contestant_id, start_episode, end_episode')
      .eq('player_id', playerId)
      .order('start_episode');

    if (selectionError) {
      throw new Error(`Failed to fetch sole survivor history: ${selectionError.message}`);
    }

    // If no selections, return 0
    if (!allSelections || allSelections.length === 0) {
      return {
        episodeBonus: 0,
        winnerBonus: 0,
        finalThreeBonus: 0,
        totalBonus: 0,
        episodeCount: 0
      };
    }

    // Get current episode number for calculating active periods
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

    // Check if there's actually a sole survivor (only one contestant remaining)
    const { data: remainingContestants, error: remainingError } = await supabase
      .from('contestants')
      .select('id, is_winner')
      .eq('is_eliminated', false);

    if (remainingError) {
      throw new Error(`Failed to fetch remaining contestants: ${remainingError.message}`);
    }

    // Only award bonus if there's exactly one contestant remaining (the sole survivor)
    if (!remainingContestants || remainingContestants.length !== 1) {
      return {
        episodeBonus: 0,
        winnerBonus: 0,
        finalThreeBonus: 0,
        totalBonus: 0,
        episodeCount: 0,
        reason: `Game still ongoing - ${remainingContestants?.length || 0} contestants remaining`
      };
    }

    const actualSoleSurvivor = remainingContestants[0];
    let totalEpisodeBonus = 0;
    let totalEpisodeCount = 0;
    let winnerBonus = 0;
    let finalThreeBonus = 0;

    // Check if the sole survivor made final 3
    const { data: finalThreeEvent, error: finalThreeError } = await supabase
      .from('contestant_events')
      .select('id, event_types!inner(event_name)')
      .eq('contestant_id', actualSoleSurvivor.id)
      .eq('event_types.event_name', 'made_final_three')
      .maybeSingle();

    if (finalThreeError) {
      throw new Error(`Failed to check final three status: ${finalThreeError.message}`);
    }

    const madeFinalThree = !!finalThreeEvent;

    // Calculate bonus for each selection period where player had the correct sole survivor
    for (const selection of allSelections) {
      if (selection.contestant_id === actualSoleSurvivor.id) {
        // Calculate end episode for this selection
        const endEpisode = selection.end_episode || currentEpisodeNumber;

        // Calculate episodes in this period
        const episodeCount = endEpisode - selection.start_episode + 1;
        const episodeBonus = episodeCount * 1; // +1 point per episode

        totalEpisodeBonus += episodeBonus;
        totalEpisodeCount += episodeCount;

        // Check for winner bonus (only awarded once, for earliest qualifying selection)
        if (winnerBonus === 0 && actualSoleSurvivor.is_winner && selection.start_episode <= 2) {
          winnerBonus = 50;
        }

        // Check for final three bonus (only awarded once, for earliest qualifying selection)
        if (finalThreeBonus === 0 && madeFinalThree && selection.start_episode < 2) {
          finalThreeBonus = 10;
        }
      }
    }

    return {
      episodeBonus: totalEpisodeBonus,
      winnerBonus,
      finalThreeBonus,
      totalBonus: totalEpisodeBonus + winnerBonus + finalThreeBonus,
      episodeCount: totalEpisodeCount,
      reason: totalEpisodeBonus > 0 ? 'Sole survivor bonus awarded' : 'Player did not select correct sole survivor'
    };
  }

  /**
   * Calculate total player score including draft picks, sole survivor bonuses, and prediction bonus
   * @param {number} playerId - Player ID
   * @returns {Promise<{draft_score: number, sole_survivor_score: number, sole_survivor_bonus: number, prediction_bonus: number, total: number}>}
   */
  async calculatePlayerScore(playerId) {
    // Get draft picks with episode ranges
    const { data: draftPicks, error: draftError } = await supabase
      .from('draft_picks')
      .select('contestant_id, start_episode, end_episode')
      .eq('player_id', playerId);

    if (draftError) {
      throw new Error(`Failed to fetch draft picks: ${draftError.message}`);
    }

    // Calculate draft score based on episode ranges
    let draftScore = 0;
    if (draftPicks && draftPicks.length > 0) {
      for (const pick of draftPicks) {
        const contestantScore = await this.calculateContestantScoreForEpisodeRange(
          pick.contestant_id,
          pick.start_episode,
          pick.end_episode
        );
        draftScore += contestantScore;
      }
    }

    // Calculate sole survivor score based on history (similar to draft picks)
    let soleSurvivorScore = 0;
    
    // Get all sole survivor history for this player
    const { data: soleSurvivorHistory, error: historyError } = await supabase
      .from('sole_survivor_history')
      .select('contestant_id, start_episode, end_episode')
      .eq('player_id', playerId)
      .order('start_episode');

    if (historyError) {
      throw new Error(`Failed to fetch sole survivor history: ${historyError.message}`);
    }

    // Calculate score for each sole survivor period
    if (soleSurvivorHistory && soleSurvivorHistory.length > 0) {
      for (const selection of soleSurvivorHistory) {
        const contestantScore = await this.calculateContestantScoreForEpisodeRangeByNumber(
          selection.contestant_id,
          selection.start_episode,
          selection.end_episode
        );
        soleSurvivorScore += contestantScore;
      }
    }

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

