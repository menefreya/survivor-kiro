const supabase = require('../db/supabase');

/**
 * Service for scoring elimination predictions
 * Handles prediction scoring, bonus calculation, and accuracy tracking
 */
class PredictionScoringService {
  /**
   * Score predictions when a contestant is eliminated
   * Called automatically when admin adds elimination event
   * @param {number} episodeId - Episode ID
   * @param {number} contestantId - Eliminated contestant ID
   * @param {string} tribe - Tribe of eliminated contestant
   * @returns {Promise<{correct: number, incorrect: number, points_awarded: number}>}
   */
  async scorePredictions(episodeId, contestantId, tribe) {
    try {
      // Query all predictions for this episode and tribe
      const { data: predictions, error: fetchError } = await supabase
        .from('elimination_predictions')
        .select('id, player_id, contestant_id')
        .eq('episode_id', episodeId)
        .eq('tribe', tribe)
        .is('is_correct', null); // Only score unscored predictions

      if (fetchError) {
        throw new Error(`Failed to fetch predictions: ${fetchError.message}`);
      }

      // If no predictions to score, return zeros
      if (!predictions || predictions.length === 0) {
        return {
          correct: 0,
          incorrect: 0,
          points_awarded: 0
        };
      }

      const now = new Date().toISOString();
      let correctCount = 0;
      let incorrectCount = 0;

      // Update predictions atomically - mark correct predictions
      const { error: correctError } = await supabase
        .from('elimination_predictions')
        .update({ 
          is_correct: true, 
          scored_at: now 
        })
        .eq('episode_id', episodeId)
        .eq('tribe', tribe)
        .eq('contestant_id', contestantId)
        .is('is_correct', null);

      if (correctError) {
        throw new Error(`Failed to update correct predictions: ${correctError.message}`);
      }

      // Count correct predictions
      correctCount = predictions.filter(p => p.contestant_id === contestantId).length;

      // Update predictions atomically - mark incorrect predictions
      const { error: incorrectError } = await supabase
        .from('elimination_predictions')
        .update({ 
          is_correct: false, 
          scored_at: now 
        })
        .eq('episode_id', episodeId)
        .eq('tribe', tribe)
        .neq('contestant_id', contestantId)
        .is('is_correct', null);

      if (incorrectError) {
        throw new Error(`Failed to update incorrect predictions: ${incorrectError.message}`);
      }

      // Count incorrect predictions
      incorrectCount = predictions.filter(p => p.contestant_id !== contestantId).length;

      // Calculate points awarded (3 points per correct prediction)
      const pointsAwarded = correctCount * 3;

      return {
        correct: correctCount,
        incorrect: incorrectCount,
        points_awarded: pointsAwarded
      };
    } catch (error) {
      console.error('Error scoring predictions:', error);
      throw error;
    }
  }

  /**
   * Get prediction bonus points for a player
   * Used in score calculation
   * @param {number} playerId - Player ID
   * @returns {Promise<number>} Total prediction bonus points
   */
  async getPredictionBonus(playerId) {
    try {
      // Query all correct predictions for this player
      const { data: correctPredictions, error } = await supabase
        .from('elimination_predictions')
        .select('id')
        .eq('player_id', playerId)
        .eq('is_correct', true);

      if (error) {
        // If table doesn't exist or other error, return 0 (graceful degradation)
        console.warn(`Could not fetch prediction bonus for player ${playerId}:`, error.message);
        return 0;
      }

      // Calculate total bonus (3 points per correct prediction)
      const totalBonus = correctPredictions && correctPredictions.length > 0
        ? correctPredictions.length * 3
        : 0;

      return totalBonus;
    } catch (error) {
      console.error('Error calculating prediction bonus:', error);
      // Return 0 instead of throwing to prevent breaking score calculation
      return 0;
    }
  }

  /**
   * Calculate prediction accuracy for a player
   * @param {number} playerId - Player ID
   * @returns {Promise<{total: number, correct: number, accuracy: number}>}
   */
  async calculatePredictionAccuracy(playerId) {
    try {
      // Query all scored predictions for this player
      const { data: scoredPredictions, error } = await supabase
        .from('elimination_predictions')
        .select('is_correct')
        .eq('player_id', playerId)
        .not('is_correct', 'is', null); // Only scored predictions

      if (error) {
        throw new Error(`Failed to fetch scored predictions: ${error.message}`);
      }

      // If no scored predictions, return zeros
      if (!scoredPredictions || scoredPredictions.length === 0) {
        return {
          total: 0,
          correct: 0,
          accuracy: 0
        };
      }

      // Count total and correct predictions
      const total = scoredPredictions.length;
      const correct = scoredPredictions.filter(p => p.is_correct === true).length;

      // Calculate accuracy percentage
      const accuracy = total > 0 ? (correct / total) * 100 : 0;

      return {
        total,
        correct,
        accuracy: Math.round(accuracy * 10) / 10 // Round to 1 decimal place
      };
    } catch (error) {
      console.error('Error calculating prediction accuracy:', error);
      throw error;
    }
  }

  /**
   * Recalculate all prediction scores for an episode
   * Used when admin corrects elimination data
   * @param {number} episodeId - Episode ID
   * @returns {Promise<void>}
   */
  async recalculatePredictionScores(episodeId) {
    try {
      // Reset all predictions for this episode (set is_correct and scored_at to NULL)
      const { error: resetError } = await supabase
        .from('elimination_predictions')
        .update({ 
          is_correct: null, 
          scored_at: null 
        })
        .eq('episode_id', episodeId);

      if (resetError) {
        throw new Error(`Failed to reset predictions: ${resetError.message}`);
      }

      // Get all elimination events for this episode
      const { data: eliminations, error: eliminationError } = await supabase
        .from('contestant_events')
        .select(`
          contestant_id,
          contestants!inner(current_tribe)
        `)
        .eq('episode_id', episodeId)
        .eq('event_types.name', 'eliminated')
        .not('contestants.current_tribe', 'is', null);

      if (eliminationError) {
        throw new Error(`Failed to fetch eliminations: ${eliminationError.message}`);
      }

      // If no eliminations, nothing to score
      if (!eliminations || eliminations.length === 0) {
        return;
      }

      // Track which tribes have been scored (only score first elimination per tribe)
      const scoredTribes = new Set();

      // Re-score predictions based on current elimination data
      for (const elimination of eliminations) {
        const tribe = elimination.contestants.current_tribe;
        
        // Skip if this tribe has already been scored
        if (scoredTribes.has(tribe)) {
          continue;
        }

        // Score predictions for this tribe
        await this.scorePredictions(
          episodeId,
          elimination.contestant_id,
          tribe
        );

        // Mark tribe as scored
        scoredTribes.add(tribe);
      }
    } catch (error) {
      console.error('Error recalculating prediction scores:', error);
      throw error;
    }
  }
}

module.exports = new PredictionScoringService();
