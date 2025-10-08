const supabase = require('../db/supabase');
const predictionScoringService = require('../services/predictionScoringService');

/**
 * Get prediction status for current episode
 * @route GET /api/predictions/status
 * @access Protected
 */
async function getPredictionStatus(req, res) {
  try {
    const playerId = req.user.id;

    // Get current episode
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, predictions_locked')
      .order('episode_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching current episode:', episodeError);
      return res.status(500).json({ error: 'Failed to fetch current episode' });
    }

    if (!currentEpisode) {
      return res.json({
        predictions_available: false,
        has_submitted: false,
        episode: null
      });
    }

    // Check if user has submitted predictions for current episode
    const { data: existingPredictions, error: predictionError } = await supabase
      .from('elimination_predictions')
      .select('id')
      .eq('player_id', playerId)
      .eq('episode_id', currentEpisode.id)
      .limit(1);

    if (predictionError) {
      console.error('Error checking predictions:', predictionError);
      return res.status(500).json({ error: 'Failed to check prediction status' });
    }

    const hasSubmitted = existingPredictions && existingPredictions.length > 0;
    const predictionsAvailable = !currentEpisode.predictions_locked && !hasSubmitted;

    res.json({
      predictions_available: predictionsAvailable,
      has_submitted: hasSubmitted,
      episode: {
        id: currentEpisode.id,
        episode_number: currentEpisode.episode_number,
        predictions_locked: currentEpisode.predictions_locked
      }
    });
  } catch (error) {
    console.error('Error in getPredictionStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit predictions for current episode
 * @route POST /api/predictions
 * @access Protected
 */
async function submitPredictions(req, res) {
  try {
    const { episode_id, predictions } = req.body;
    const playerId = req.user.id;

    // Validate required fields
    if (!episode_id || !predictions || !Array.isArray(predictions)) {
      return res.status(400).json({ 
        error: 'episode_id and predictions array are required' 
      });
    }

    // Validate at least one prediction
    if (predictions.length === 0) {
      return res.status(400).json({ 
        error: 'At least one prediction is required' 
      });
    }

    // Validate episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, predictions_locked')
      .eq('id', episode_id)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching episode:', episodeError);
      return res.status(500).json({ error: 'Failed to validate episode' });
    }

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Check if predictions are locked
    if (episode.predictions_locked) {
      return res.status(400).json({ 
        error: 'Predictions are locked for this episode' 
      });
    }

    // Check for duplicate submissions
    const { data: existingPredictions, error: duplicateError } = await supabase
      .from('elimination_predictions')
      .select('id')
      .eq('player_id', playerId)
      .eq('episode_id', episode_id)
      .limit(1);

    if (duplicateError) {
      console.error('Error checking for duplicates:', duplicateError);
      return res.status(500).json({ error: 'Failed to check for existing predictions' });
    }

    if (existingPredictions && existingPredictions.length > 0) {
      return res.status(409).json({ 
        error: 'You have already submitted predictions for this episode' 
      });
    }

    // Validate and prepare predictions for insertion
    const predictionsToInsert = [];
    const validatedPredictions = [];

    for (const prediction of predictions) {
      const { tribe, contestant_id } = prediction;

      // Validate required fields
      if (!tribe || !contestant_id) {
        return res.status(400).json({ 
          error: 'Each prediction must have tribe and contestant_id' 
        });
      }

      // Validate contestant exists and belongs to tribe
      const { data: contestant, error: contestantError } = await supabase
        .from('contestants')
        .select('id, name, current_tribe, is_eliminated')
        .eq('id', contestant_id)
        .maybeSingle();

      if (contestantError) {
        console.error('Error fetching contestant:', contestantError);
        return res.status(500).json({ error: 'Failed to validate contestant' });
      }

      if (!contestant) {
        return res.status(400).json({ 
          error: `Contestant with id ${contestant_id} not found` 
        });
      }

      // Check if contestant is eliminated
      if (contestant.is_eliminated) {
        return res.status(400).json({ 
          error: `Cannot predict eliminated contestant: ${contestant.name}` 
        });
      }

      // Check if contestant belongs to specified tribe
      if (contestant.current_tribe !== tribe) {
        return res.status(400).json({ 
          error: `Contestant ${contestant.name} is not in tribe ${tribe}` 
        });
      }

      predictionsToInsert.push({
        player_id: playerId,
        episode_id: parseInt(episode_id),
        tribe: tribe,
        contestant_id: parseInt(contestant_id)
      });

      validatedPredictions.push({
        tribe: tribe,
        contestant: {
          id: contestant.id,
          name: contestant.name
        }
      });
    }

    // Insert predictions into database
    const { data: insertedPredictions, error: insertError } = await supabase
      .from('elimination_predictions')
      .insert(predictionsToInsert)
      .select('id, tribe, contestant_id');

    if (insertError) {
      console.error('Error inserting predictions:', insertError);
      
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return res.status(409).json({ 
          error: 'Duplicate prediction detected for a tribe' 
        });
      }
      
      return res.status(500).json({ error: 'Failed to submit predictions' });
    }

    // Combine inserted IDs with validated data
    const result = insertedPredictions.map((inserted, index) => ({
      id: inserted.id,
      ...validatedPredictions[index]
    }));

    res.status(201).json({
      message: 'Predictions submitted successfully',
      predictions: result
    });
  } catch (error) {
    console.error('Error in submitPredictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current user's predictions for current episode
 * @route GET /api/predictions/current
 * @access Protected
 */
async function getCurrentPredictions(req, res) {
  try {
    const playerId = req.user.id;

    // Get current episode (most recent)
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, predictions_locked')
      .order('episode_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching current episode:', episodeError);
      return res.status(500).json({ error: 'Failed to fetch current episode' });
    }

    if (!currentEpisode) {
      return res.json({
        episode: null,
        predictions: [],
        message: 'No current episode available'
      });
    }

    // Get predictions for current user and current episode
    const { data: predictions, error: predictionsError } = await supabase
      .from('elimination_predictions')
      .select(`
        id,
        tribe,
        contestant_id,
        is_correct,
        scored_at,
        created_at,
        contestants (
          id,
          name,
          image_url,
          current_tribe
        )
      `)
      .eq('player_id', playerId)
      .eq('episode_id', currentEpisode.id);

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    // Group predictions by tribe
    const groupedPredictions = {};
    
    for (const prediction of predictions || []) {
      groupedPredictions[prediction.tribe] = {
        id: prediction.id,
        contestant: prediction.contestants,
        is_correct: prediction.is_correct,
        scored_at: prediction.scored_at,
        created_at: prediction.created_at
      };
    }

    res.json({
      episode: {
        id: currentEpisode.id,
        episode_number: currentEpisode.episode_number,
        predictions_locked: currentEpisode.predictions_locked
      },
      predictions: groupedPredictions,
      has_submitted: predictions && predictions.length > 0
    });
  } catch (error) {
    console.error('Error in getCurrentPredictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get prediction history for current user
 * @route GET /api/predictions/history
 * @access Protected
 */
async function getPredictionHistory(req, res) {
  try {
    const playerId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Parse pagination parameters
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || offsetNum < 0) {
      return res.status(400).json({ 
        error: 'Invalid pagination parameters' 
      });
    }

    // Get all scored predictions for the user
    const { data: predictions, error: predictionsError } = await supabase
      .from('elimination_predictions')
      .select(`
        id,
        tribe,
        contestant_id,
        is_correct,
        scored_at,
        created_at,
        episode_id,
        episodes (
          id,
          episode_number,
          aired_date
        ),
        contestants (
          id,
          name,
          image_url
        )
      `)
      .eq('player_id', playerId)
      .not('is_correct', 'is', null)
      .order('episode_id', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (predictionsError) {
      console.error('Error fetching prediction history:', predictionsError);
      return res.status(500).json({ error: 'Failed to fetch prediction history' });
    }

    // For each prediction, get the actual eliminated contestant
    const enrichedPredictions = [];
    
    for (const prediction of predictions || []) {
      // Find the actual eliminated contestant for this episode and tribe
      const { data: eliminatedEvents, error: eventsError } = await supabase
        .from('contestant_events')
        .select(`
          contestant_id,
          contestants (
            id,
            name,
            image_url,
            current_tribe
          ),
          event_types (
            name
          )
        `)
        .eq('episode_id', prediction.episode_id)
        .eq('event_types.name', 'eliminated');

      if (eventsError) {
        console.error('Error fetching elimination events:', eventsError);
      }

      // Find the eliminated contestant from the same tribe
      let actualEliminated = null;
      if (eliminatedEvents && eliminatedEvents.length > 0) {
        for (const event of eliminatedEvents) {
          // Match by tribe at time of prediction
          if (event.contestants && event.contestants.current_tribe === prediction.tribe) {
            actualEliminated = event.contestants;
            break;
          }
        }
      }

      enrichedPredictions.push({
        id: prediction.id,
        episode_number: prediction.episodes.episode_number,
        aired_date: prediction.episodes.aired_date,
        tribe: prediction.tribe,
        predicted_contestant: prediction.contestants,
        actual_eliminated: actualEliminated,
        is_correct: prediction.is_correct,
        points_earned: prediction.is_correct ? 5 : 0,
        scored_at: prediction.scored_at
      });
    }

    res.json({
      predictions: enrichedPredictions,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        returned: enrichedPredictions.length
      }
    });
  } catch (error) {
    console.error('Error in getPredictionHistory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all predictions for an episode (admin only)
 * @route GET /api/episodes/:episodeId/predictions
 * @access Admin only
 */
async function getEpisodePredictions(req, res) {
  try {
    const { episodeId } = req.params;

    // Validate episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, predictions_locked')
      .eq('id', episodeId)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching episode:', episodeError);
      return res.status(500).json({ error: 'Failed to fetch episode' });
    }

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Get all predictions for this episode
    const { data: predictions, error: predictionsError } = await supabase
      .from('elimination_predictions')
      .select(`
        id,
        player_id,
        tribe,
        contestant_id,
        is_correct,
        scored_at,
        created_at,
        players (
          id,
          name,
          email
        ),
        contestants (
          id,
          name,
          image_url,
          current_tribe
        )
      `)
      .eq('episode_id', episodeId)
      .order('tribe', { ascending: true })
      .order('player_id', { ascending: true });

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    // Group predictions by tribe
    const groupedByTribe = {};
    
    for (const prediction of predictions || []) {
      if (!groupedByTribe[prediction.tribe]) {
        groupedByTribe[prediction.tribe] = [];
      }
      
      groupedByTribe[prediction.tribe].push({
        id: prediction.id,
        player: {
          id: prediction.players.id,
          name: prediction.players.name,
          email: prediction.players.email
        },
        contestant: prediction.contestants,
        is_correct: prediction.is_correct,
        scored: prediction.is_correct !== null,
        scored_at: prediction.scored_at,
        created_at: prediction.created_at
      });
    }

    res.json({
      episode: {
        id: episode.id,
        episode_number: episode.episode_number,
        predictions_locked: episode.predictions_locked
      },
      predictions_by_tribe: groupedByTribe,
      total_predictions: predictions ? predictions.length : 0
    });
  } catch (error) {
    console.error('Error in getEpisodePredictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Lock or unlock predictions for an episode (admin only)
 * @route PUT /api/episodes/:episodeId/lock-predictions
 * @access Admin only
 */
async function togglePredictionLock(req, res) {
  try {
    const { episodeId } = req.params;
    const { locked } = req.body;

    // Validate locked parameter
    if (typeof locked !== 'boolean') {
      return res.status(400).json({ 
        error: 'locked parameter must be a boolean' 
      });
    }

    // Validate episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, predictions_locked')
      .eq('id', episodeId)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching episode:', episodeError);
      return res.status(500).json({ error: 'Failed to fetch episode' });
    }

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Update predictions_locked flag
    const { data: updatedEpisode, error: updateError } = await supabase
      .from('episodes')
      .update({ predictions_locked: locked })
      .eq('id', episodeId)
      .select('id, episode_number, predictions_locked')
      .single();

    if (updateError) {
      console.error('Error updating episode:', updateError);
      return res.status(500).json({ error: 'Failed to update prediction lock status' });
    }

    res.json({
      message: `Predictions ${locked ? 'locked' : 'unlocked'} successfully`,
      episode: updatedEpisode
    });
  } catch (error) {
    console.error('Error in togglePredictionLock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get prediction statistics (admin only)
 * @route GET /api/predictions/statistics
 * @access Admin only
 */
async function getPredictionStatistics(req, res) {
  try {
    // Get total number of players
    const { count: totalPlayers, error: playersError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (playersError) {
      console.error('Error counting players:', playersError);
      return res.status(500).json({ error: 'Failed to count players' });
    }

    // Get all predictions
    const { data: allPredictions, error: predictionsError } = await supabase
      .from('elimination_predictions')
      .select('id, episode_id, player_id, is_correct, scored_at');

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    // Calculate overall statistics
    const totalPredictions = allPredictions ? allPredictions.length : 0;
    const scoredPredictions = allPredictions ? allPredictions.filter(p => p.is_correct !== null) : [];
    const correctPredictions = scoredPredictions.filter(p => p.is_correct === true);
    
    const overallAccuracy = scoredPredictions.length > 0 
      ? (correctPredictions.length / scoredPredictions.length) * 100 
      : 0;

    // Group by episode
    const episodeStats = {};
    
    for (const prediction of allPredictions || []) {
      if (!episodeStats[prediction.episode_id]) {
        episodeStats[prediction.episode_id] = {
          total: 0,
          scored: 0,
          correct: 0,
          unique_players: new Set()
        };
      }
      
      episodeStats[prediction.episode_id].total++;
      episodeStats[prediction.episode_id].unique_players.add(prediction.player_id);
      
      if (prediction.is_correct !== null) {
        episodeStats[prediction.episode_id].scored++;
        if (prediction.is_correct) {
          episodeStats[prediction.episode_id].correct++;
        }
      }
    }

    // Get episode details and format statistics
    const episodeStatistics = [];
    
    for (const episodeId in episodeStats) {
      const { data: episode, error: episodeError } = await supabase
        .from('episodes')
        .select('id, episode_number')
        .eq('id', episodeId)
        .maybeSingle();

      if (episodeError || !episode) {
        continue;
      }

      const stats = episodeStats[episodeId];
      const accuracy = stats.scored > 0 ? (stats.correct / stats.scored) * 100 : 0;
      const participationRate = totalPlayers > 0 
        ? (stats.unique_players.size / totalPlayers) * 100 
        : 0;

      episodeStatistics.push({
        episode_number: episode.episode_number,
        total_predictions: stats.total,
        scored_predictions: stats.scored,
        correct_predictions: stats.correct,
        accuracy: Math.round(accuracy * 10) / 10,
        players_participated: stats.unique_players.size,
        participation_rate: Math.round(participationRate * 10) / 10
      });
    }

    // Sort by episode number
    episodeStatistics.sort((a, b) => a.episode_number - b.episode_number);

    res.json({
      overall: {
        total_predictions: totalPredictions,
        scored_predictions: scoredPredictions.length,
        correct_predictions: correctPredictions.length,
        accuracy: Math.round(overallAccuracy * 10) / 10,
        total_players: totalPlayers
      },
      by_episode: episodeStatistics
    });
  } catch (error) {
    console.error('Error in getPredictionStatistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all players' predictions for current episode (accessible to all users)
 * @route GET /api/predictions/all
 * @access Protected
 */
async function getAllCurrentPredictions(req, res) {
  try {
    // Get current episode (most recent)
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, predictions_locked')
      .order('episode_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching current episode:', episodeError);
      return res.status(500).json({ error: 'Failed to fetch current episode' });
    }

    if (!currentEpisode) {
      return res.json({
        episode: null,
        predictions: [],
        message: 'No current episode available'
      });
    }

    // Get all predictions for current episode
    const { data: predictions, error: predictionsError } = await supabase
      .from('elimination_predictions')
      .select(`
        id,
        player_id,
        tribe,
        contestant_id,
        is_correct,
        scored_at,
        created_at,
        players (
          id,
          name,
          profile_image_url
        ),
        contestants (
          id,
          name,
          image_url,
          current_tribe,
          profession
        )
      `)
      .eq('episode_id', currentEpisode.id)
      .order('created_at', { ascending: true });

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    // Group predictions by player
    const groupedByPlayer = {};

    for (const prediction of predictions || []) {
      const playerId = prediction.player_id;

      if (!groupedByPlayer[playerId]) {
        groupedByPlayer[playerId] = {
          player: {
            id: prediction.players.id,
            name: prediction.players.name,
            profile_image_url: prediction.players.profile_image_url
          },
          predictions: []
        };
      }

      groupedByPlayer[playerId].predictions.push({
        id: prediction.id,
        tribe: prediction.tribe,
        contestant: prediction.contestants,
        is_correct: prediction.is_correct,
        scored_at: prediction.scored_at,
        created_at: prediction.created_at
      });
    }

    // Convert to array and sort by player name
    const playerPredictions = Object.values(groupedByPlayer).sort((a, b) =>
      a.player.name.localeCompare(b.player.name)
    );

    // Get all players to find who hasn't submitted
    const { data: allPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name, profile_image_url')
      .order('name', { ascending: true });

    if (playersError) {
      console.error('Error fetching all players:', playersError);
    }

    // Find players who haven't submitted predictions
    const playerIdsWithPredictions = new Set(Object.keys(groupedByPlayer).map(id => parseInt(id)));
    const playersWithoutPredictions = (allPlayers || []).filter(
      player => !playerIdsWithPredictions.has(player.id)
    );

    res.json({
      episode: {
        id: currentEpisode.id,
        episode_number: currentEpisode.episode_number,
        predictions_locked: currentEpisode.predictions_locked
      },
      player_predictions: playerPredictions,
      players_without_predictions: playersWithoutPredictions,
      total_players: playerPredictions.length,
      total_players_without_predictions: playersWithoutPredictions.length
    });
  } catch (error) {
    console.error('Error in getAllCurrentPredictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getPredictionStatus,
  submitPredictions,
  getCurrentPredictions,
  getPredictionHistory,
  getEpisodePredictions,
  togglePredictionLock,
  getPredictionStatistics,
  getAllCurrentPredictions
};
