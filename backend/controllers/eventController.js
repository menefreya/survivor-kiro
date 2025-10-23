const supabase = require('../db/supabase');
const scoreCalculationService = require('../services/scoreCalculationService');
const predictionScoringService = require('../services/predictionScoringService');
const { clearLeaderboardCache } = require('./leaderboardController');
const { replaceEliminatedDraftPicks } = require('../services/draftService');

/**
 * Helper function to update contestant elimination status
 * Sets is_eliminated to true for elimination events (event_type_id 10 or 29)
 * Also triggers draft pick replacement for eliminated contestants
 */
async function updateContestantEliminationStatus(contestantId, eventTypeId) {
  // Check if this is an elimination event (10 = eliminated, 29 = eliminated_medical)
  if (eventTypeId === 10 || eventTypeId === 29) {
    const { error } = await supabase
      .from('contestants')
      .update({ is_eliminated: true })
      .eq('id', contestantId);

    if (error) {
      console.error('Error updating contestant elimination status:', error);
      throw error;
    }

    console.log(`Contestant ${contestantId} marked as eliminated due to event type ${eventTypeId}`);

    // Trigger draft pick replacement for eliminated contestant
    try {
      const replacements = await replaceEliminatedDraftPicks(contestantId);
      if (replacements.length > 0) {
        console.log(`Replaced ${replacements.length} draft pick(s) for eliminated contestant ${contestantId}:`, replacements);
      }
    } catch (replacementError) {
      console.error('Error replacing draft picks for eliminated contestant:', replacementError);
      // Don't throw - elimination status was still updated successfully
    }
  }
}

/**
 * Helper function to update contestant winner status
 * Sets is_winner to true for winner events (event_type_id 33)
 */
async function updateContestantWinnerStatus(contestantId, eventTypeId) {
  // Check if this is a winner event (33 = winner)
  if (eventTypeId === 33) {
    const { error } = await supabase
      .from('contestants')
      .update({ is_winner: true })
      .eq('id', contestantId);

    if (error) {
      console.error('Error updating contestant winner status:', error);
      throw error;
    }

    console.log(`Contestant ${contestantId} marked as winner due to event type ${eventTypeId}`);
  }
}

/**
 * Helper function to check and update elimination status after event deletion
 * Sets is_eliminated to false if no elimination events remain for the contestant
 * Note: Draft pick restoration after un-elimination is complex and not automatically handled
 */
async function checkAndUpdateEliminationStatusAfterDeletion(contestantId) {
  // Check if the contestant still has any elimination events
  const { data: remainingEliminations, error } = await supabase
    .from('contestant_events')
    .select('id')
    .eq('contestant_id', contestantId)
    .in('event_type_id', [10, 29])
    .limit(1);

  if (error) {
    console.error('Error checking remaining elimination events:', error);
    throw error;
  }

  // If no elimination events remain, mark contestant as not eliminated
  if (!remainingEliminations || remainingEliminations.length === 0) {
    const { error: updateError } = await supabase
      .from('contestants')
      .update({ is_eliminated: false })
      .eq('id', contestantId);

    if (updateError) {
      console.error('Error updating contestant elimination status to false:', updateError);
      throw updateError;
    }

    console.log(`Contestant ${contestantId} marked as not eliminated (no elimination events remain)`);
    
    // Note: We don't automatically restore draft picks here because:
    // 1. The replacement contestant may already be scoring points for other players
    // 2. The logic for "undoing" a draft pick replacement is complex
    // 3. Manual admin intervention may be needed to decide the best course of action
    console.log(`Manual review may be needed for draft pick restoration for contestant ${contestantId}`);
  }
}

/**
 * Helper function to check and update winner status after event deletion
 * Sets is_winner to false if no winner events remain for the contestant
 */
async function checkAndUpdateWinnerStatusAfterDeletion(contestantId) {
  // Check if the contestant still has any winner events
  const { data: remainingWinnerEvents, error } = await supabase
    .from('contestant_events')
    .select('id')
    .eq('contestant_id', contestantId)
    .eq('event_type_id', 33) // 33 = winner
    .limit(1);

  if (error) {
    console.error('Error checking remaining winner events:', error);
    throw error;
  }

  // If no winner events remain, mark contestant as not winner
  if (!remainingWinnerEvents || remainingWinnerEvents.length === 0) {
    const { error: updateError } = await supabase
      .from('contestants')
      .update({ is_winner: false })
      .eq('id', contestantId);

    if (updateError) {
      console.error('Error updating contestant winner status to false:', updateError);
      throw updateError;
    }

    console.log(`Contestant ${contestantId} marked as not winner (no winner events remain)`);
  }
}

/**
 * Get all events for an episode grouped by contestant
 * @route GET /api/episodes/:episodeId/events
 * @access Protected
 */
async function getEpisodeEvents(req, res) {
  try {
    const { episodeId } = req.params;

    // Fetch all contestant_events for this episode with event_type details
    const { data: events, error } = await supabase
      .from('contestant_events')
      .select(`
        id,
        contestant_id,
        event_type_id,
        point_value,
        created_at,
        event_types (
          id,
          name,
          display_name,
          category,
          point_value
        ),
        contestants (
          id,
          name,
          image_url
        )
      `)
      .eq('episode_id', episodeId)
      .order('contestant_id', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching episode events:', error);
      return res.status(500).json({ error: 'Failed to fetch episode events' });
    }

    // Group events by contestant
    const groupedByContestant = {};
    
    for (const event of events || []) {
      const contestantId = event.contestant_id;
      
      if (!groupedByContestant[contestantId]) {
        groupedByContestant[contestantId] = {
          contestant: event.contestants,
          events: [],
          episode_score: 0
        };
      }
      
      groupedByContestant[contestantId].events.push({
        id: event.id,
        event_type_id: event.event_type_id,
        event_type: event.event_types,
        point_value: event.point_value,
        created_at: event.created_at
      });
    }

    // Calculate and include episode score per contestant
    for (const contestantId in groupedByContestant) {
      const episodeScore = await scoreCalculationService.calculateEpisodeScore(
        parseInt(episodeId),
        parseInt(contestantId)
      );
      groupedByContestant[contestantId].episode_score = episodeScore;
    }

    // Convert to array format
    const result = Object.keys(groupedByContestant).map(contestantId => ({
      contestant_id: parseInt(contestantId),
      ...groupedByContestant[contestantId]
    }));

    res.json(result);
  } catch (error) {
    console.error('Error in getEpisodeEvents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add events for contestants in an episode
 * @route POST /api/episodes/:episodeId/events
 * @access Admin only
 */
async function addEvents(req, res) {
  try {
    const { episodeId } = req.params;
    const { events } = req.body;

    // Validate request body
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }

    // Validate episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching episode:', episodeError);
      return res.status(500).json({ error: 'Failed to validate episode' });
    }

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Validate and prepare events for insertion
    const eventsToInsert = [];
    const affectedContestants = new Set();

    for (const event of events) {
      const { contestant_id, event_type_id } = event;

      // Validate required fields
      if (!contestant_id || !event_type_id) {
        return res.status(400).json({ 
          error: 'Each event must have contestant_id and event_type_id' 
        });
      }

      // Validate contestant exists
      const { data: contestant, error: contestantError } = await supabase
        .from('contestants')
        .select('id')
        .eq('id', contestant_id)
        .maybeSingle();

      if (contestantError || !contestant) {
        return res.status(400).json({ 
          error: `Contestant with id ${contestant_id} not found` 
        });
      }

      // Validate event_type exists and get point_value
      const { data: eventType, error: eventTypeError } = await supabase
        .from('event_types')
        .select('id, point_value, is_active')
        .eq('id', event_type_id)
        .maybeSingle();

      if (eventTypeError || !eventType) {
        return res.status(400).json({ 
          error: `Event type with id ${event_type_id} not found` 
        });
      }

      if (!eventType.is_active) {
        return res.status(400).json({ 
          error: `Event type with id ${event_type_id} is not active` 
        });
      }

      // Snapshot point_value from event_type
      eventsToInsert.push({
        episode_id: parseInt(episodeId),
        contestant_id: parseInt(contestant_id),
        event_type_id: parseInt(event_type_id),
        point_value: eventType.point_value,
        created_by: req.user.id
      });

      affectedContestants.add(parseInt(contestant_id));
    }

    // Insert events into contestant_events table
    const { data: insertedEvents, error: insertError } = await supabase
      .from('contestant_events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting events:', insertError);
      return res.status(500).json({ error: 'Failed to insert events' });
    }

    // Update elimination status for any elimination events
    for (const event of insertedEvents) {
      try {
        await updateContestantEliminationStatus(event.contestant_id, event.event_type_id);
        await updateContestantWinnerStatus(event.contestant_id, event.event_type_id);
      } catch (error) {
        console.error('Error updating contestant status:', error);
        // Continue processing other events even if status update fails
      }
    }

    // Check for elimination events and trigger prediction scoring
    const predictionScoringResults = [];
    for (const event of insertedEvents) {
      // Get event type to check if it's an elimination
      const { data: eventType, error: eventTypeError } = await supabase
        .from('event_types')
        .select('name')
        .eq('id', event.event_type_id)
        .single();

      if (eventTypeError) {
        console.error('Error fetching event type:', eventTypeError);
        continue;
      }

      // If this is an elimination event, score predictions
      if (eventType.name === 'eliminated') {
        // Get contestant's current_tribe
        const { data: contestant, error: contestantError } = await supabase
          .from('contestants')
          .select('current_tribe')
          .eq('id', event.contestant_id)
          .single();

        if (contestantError) {
          console.error('Error fetching contestant for prediction scoring:', contestantError);
          continue;
        }

        // Only score predictions if contestant has a tribe
        if (contestant.current_tribe) {
          try {
            const scoringResult = await predictionScoringService.scorePredictions(
              event.episode_id,
              event.contestant_id,
              contestant.current_tribe
            );
            
            predictionScoringResults.push({
              episode_id: event.episode_id,
              contestant_id: event.contestant_id,
              tribe: contestant.current_tribe,
              ...scoringResult
            });
          } catch (error) {
            console.error('Error scoring predictions:', error);
            // Continue processing other events even if prediction scoring fails
          }
        }
      }
    }

    // Recalculate episode scores and update contestant total scores
    const updatedScores = [];
    
    for (const contestantId of affectedContestants) {
      // Recalculate episode score
      const episodeScore = await scoreCalculationService.calculateEpisodeScore(
        parseInt(episodeId),
        contestantId
      );

      // Update or insert episode_scores record
      const { data: existingScore, error: fetchError } = await supabase
        .from('episode_scores')
        .select('id')
        .eq('episode_id', episodeId)
        .eq('contestant_id', contestantId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching episode score:', fetchError);
        continue;
      }

      if (existingScore) {
        // Update existing score
        await supabase
          .from('episode_scores')
          .update({ 
            score: episodeScore,
            source: 'events',
            calculated_at: new Date().toISOString()
          })
          .eq('id', existingScore.id);
      } else {
        // Insert new score
        await supabase
          .from('episode_scores')
          .insert({
            episode_id: parseInt(episodeId),
            contestant_id: contestantId,
            score: episodeScore,
            source: 'events',
            calculated_at: new Date().toISOString()
          });
      }

      // Update contestant total_score
      const totalScore = await scoreCalculationService.updateContestantTotalScore(contestantId);

      updatedScores.push({
        contestant_id: contestantId,
        episode_score: episodeScore,
        total_score: totalScore
      });
    }

    // Clear leaderboard cache since scores were updated
    clearLeaderboardCache();

    res.status(201).json({
      message: 'Events added successfully',
      events: insertedEvents,
      updated_scores: updatedScores,
      prediction_scoring: predictionScoringResults
    });
  } catch (error) {
    console.error('Error in addEvents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a specific event
 * @route DELETE /api/episodes/:episodeId/events/:eventId
 * @access Admin only
 */
async function deleteEvent(req, res) {
  try {
    const { episodeId, eventId } = req.params;

    // Validate event exists and belongs to episode
    const { data: event, error: fetchError } = await supabase
      .from('contestant_events')
      .select('id, episode_id, contestant_id, event_type_id')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching event:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch event' });
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.episode_id !== parseInt(episodeId)) {
      return res.status(400).json({ error: 'Event does not belong to this episode' });
    }

    const contestantId = event.contestant_id;
    const eventTypeId = event.event_type_id;

    // Delete event from contestant_events
    const { error: deleteError } = await supabase
      .from('contestant_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return res.status(500).json({ error: 'Failed to delete event' });
    }

    // Check if we need to update elimination status after deletion
    if (eventTypeId === 10 || eventTypeId === 29) {
      try {
        await checkAndUpdateEliminationStatusAfterDeletion(contestantId);
      } catch (error) {
        console.error('Error updating elimination status after deletion:', error);
        // Continue processing even if elimination status update fails
      }
    }

    // Check if we need to update winner status after deletion
    if (eventTypeId === 33) {
      try {
        await checkAndUpdateWinnerStatusAfterDeletion(contestantId);
      } catch (error) {
        console.error('Error updating winner status after deletion:', error);
        // Continue processing even if winner status update fails
      }
    }

    // Recalculate episode score
    const episodeScore = await scoreCalculationService.calculateEpisodeScore(
      parseInt(episodeId),
      contestantId
    );

    // Update episode_scores record
    await supabase
      .from('episode_scores')
      .update({ 
        score: episodeScore,
        source: 'events',
        calculated_at: new Date().toISOString()
      })
      .eq('episode_id', episodeId)
      .eq('contestant_id', contestantId);

    // Update contestant total_score
    const totalScore = await scoreCalculationService.updateContestantTotalScore(contestantId);

    res.json({
      message: 'Event deleted successfully',
      updated_scores: {
        contestant_id: contestantId,
        episode_score: episodeScore,
        total_score: totalScore
      }
    });
  } catch (error) {
    console.error('Error in deleteEvent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Bulk update events (add and remove in single transaction)
 * @route POST /api/episodes/:episodeId/events/bulk
 * @access Admin only
 */
async function bulkUpdateEvents(req, res) {
  try {
    const { episodeId } = req.params;
    const { add = [], remove = [] } = req.body;

    // Validate episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .maybeSingle();

    if (episodeError) {
      console.error('Error fetching episode:', episodeError);
      return res.status(500).json({ error: 'Failed to validate episode' });
    }

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const affectedContestants = new Set();

    // Process deletions
    if (remove.length > 0) {
      for (const eventId of remove) {
        // Fetch event to get contestant_id and event_type_id
        const { data: event, error: fetchError } = await supabase
          .from('contestant_events')
          .select('contestant_id, episode_id, event_type_id')
          .eq('id', eventId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching event for deletion:', fetchError);
          continue;
        }

        if (!event) {
          console.warn(`Event ${eventId} not found, skipping deletion`);
          continue;
        }

        if (event.episode_id !== parseInt(episodeId)) {
          console.warn(`Event ${eventId} does not belong to episode ${episodeId}, skipping`);
          continue;
        }

        affectedContestants.add(event.contestant_id);

        // Delete the event
        const { error: deleteError } = await supabase
          .from('contestant_events')
          .delete()
          .eq('id', eventId);

        if (deleteError) {
          console.error('Error deleting event:', deleteError);
          continue;
        }

        // Check if we need to update elimination status after deletion
        if (event.event_type_id === 10 || event.event_type_id === 29) {
          try {
            await checkAndUpdateEliminationStatusAfterDeletion(event.contestant_id);
          } catch (error) {
            console.error('Error updating elimination status after deletion:', error);
            // Continue processing other events even if elimination status update fails
          }
        }

        // Check if we need to update winner status after deletion
        if (event.event_type_id === 33) {
          try {
            await checkAndUpdateWinnerStatusAfterDeletion(event.contestant_id);
          } catch (error) {
            console.error('Error updating winner status after deletion:', error);
            // Continue processing other events even if winner status update fails
          }
        }
      }
    }

    // Process additions
    const eventsToInsert = [];
    let insertedEvents = [];
    
    if (add.length > 0) {
      for (const event of add) {
        const { contestant_id, event_type_id } = event;

        // Validate required fields
        if (!contestant_id || !event_type_id) {
          return res.status(400).json({ 
            error: 'Each event must have contestant_id and event_type_id' 
          });
        }

        // Validate contestant exists
        const { data: contestant, error: contestantError } = await supabase
          .from('contestants')
          .select('id')
          .eq('id', contestant_id)
          .maybeSingle();

        if (contestantError || !contestant) {
          return res.status(400).json({ 
            error: `Contestant with id ${contestant_id} not found` 
          });
        }

        // Validate event_type exists and get point_value
        const { data: eventType, error: eventTypeError } = await supabase
          .from('event_types')
          .select('id, point_value, is_active')
          .eq('id', event_type_id)
          .maybeSingle();

        if (eventTypeError || !eventType) {
          return res.status(400).json({ 
            error: `Event type with id ${event_type_id} not found` 
          });
        }

        if (!eventType.is_active) {
          return res.status(400).json({ 
            error: `Event type with id ${event_type_id} is not active` 
          });
        }

        // Snapshot point_value from event_type
        eventsToInsert.push({
          episode_id: parseInt(episodeId),
          contestant_id: parseInt(contestant_id),
          event_type_id: parseInt(event_type_id),
          point_value: eventType.point_value,
          created_by: req.user.id
        });

        affectedContestants.add(parseInt(contestant_id));
      }

      // Insert all new events
      if (eventsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('contestant_events')
          .insert(eventsToInsert)
          .select();

        if (insertError) {
          console.error('Error inserting events:', insertError);
          return res.status(500).json({ error: 'Failed to insert events' });
        }
        
        insertedEvents = data || [];

        // Update elimination and winner status for any relevant events
        for (const event of insertedEvents) {
          try {
            await updateContestantEliminationStatus(event.contestant_id, event.event_type_id);
            await updateContestantWinnerStatus(event.contestant_id, event.event_type_id);
          } catch (error) {
            console.error('Error updating contestant status:', error);
            // Continue processing other events even if status update fails
          }
        }
      }
    }

    // Check for elimination events and trigger prediction scoring
    const predictionScoringResults = [];
    
    for (const event of insertedEvents) {
      // Get event type to check if it's an elimination
      const { data: eventType, error: eventTypeError } = await supabase
        .from('event_types')
        .select('name')
        .eq('id', event.event_type_id)
        .single();

      if (eventTypeError) {
        console.error('Error fetching event type:', eventTypeError);
        continue;
      }

      // If this is an elimination event, score predictions
      if (eventType.name === 'eliminated') {
        // Get contestant's current_tribe
        const { data: contestant, error: contestantError } = await supabase
          .from('contestants')
          .select('current_tribe')
          .eq('id', event.contestant_id)
          .single();

        if (contestantError) {
          console.error('Error fetching contestant for prediction scoring:', contestantError);
          continue;
        }

        // Only score predictions if contestant has a tribe
        if (contestant.current_tribe) {
          try {
            const scoringResult = await predictionScoringService.scorePredictions(
              event.episode_id,
              event.contestant_id,
              contestant.current_tribe
            );
            
            predictionScoringResults.push({
              episode_id: event.episode_id,
              contestant_id: event.contestant_id,
              tribe: contestant.current_tribe,
              ...scoringResult
            });
          } catch (error) {
            console.error('Error scoring predictions:', error);
            // Continue processing other events even if prediction scoring fails
          }
        }
      }
    }

    // Recalculate affected contestant scores
    const updatedScores = [];
    
    for (const contestantId of affectedContestants) {
      // Recalculate episode score
      const episodeScore = await scoreCalculationService.calculateEpisodeScore(
        parseInt(episodeId),
        contestantId
      );

      // Update or insert episode_scores record
      const { data: existingScore, error: fetchError } = await supabase
        .from('episode_scores')
        .select('id')
        .eq('episode_id', episodeId)
        .eq('contestant_id', contestantId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching episode score:', fetchError);
        continue;
      }

      if (existingScore) {
        // Update existing score
        await supabase
          .from('episode_scores')
          .update({ 
            score: episodeScore,
            source: 'events',
            calculated_at: new Date().toISOString()
          })
          .eq('id', existingScore.id);
      } else {
        // Insert new score
        await supabase
          .from('episode_scores')
          .insert({
            episode_id: parseInt(episodeId),
            contestant_id: contestantId,
            score: episodeScore,
            source: 'events',
            calculated_at: new Date().toISOString()
          });
      }

      // Update contestant total_score
      const totalScore = await scoreCalculationService.updateContestantTotalScore(contestantId);

      updatedScores.push({
        contestant_id: contestantId,
        episode_score: episodeScore,
        total_score: totalScore
      });
    }

    res.json({
      message: 'Bulk update completed successfully',
      added: eventsToInsert.length,
      removed: remove.length,
      updated_scores: updatedScores,
      prediction_scoring: predictionScoringResults
    });
  } catch (error) {
    console.error('Error in bulkUpdateEvents:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  getEpisodeEvents,
  addEvents,
  deleteEvent,
  bulkUpdateEvents
};
