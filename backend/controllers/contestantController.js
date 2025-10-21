const supabase = require('../db/supabase');
const { replaceEliminatedDraftPicks } = require('../services/draftService');
const { calculateMultipleContestantTrends } = require('../services/contestantPerformanceService');

/**
 * Get all contestants
 * @route GET /api/contestants
 * @query episodeId - Optional: Filter to only show contestants active in this episode
 * @access Protected
 */
async function getAllContestants(req, res) {
  try {
    const { episodeId } = req.query;

    // If no episodeId provided, return all contestants
    if (!episodeId) {
      const { data, error } = await supabase
        .from('contestants')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching contestants:', error);
        return res.status(500).json({ error: 'Failed to fetch contestants' });
      }

      return res.json(data);
    }

    // Get the episode number for the requested episodeId
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('episode_number')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const targetEpisodeNumber = episode.episode_number;

    // Get all contestants
    const { data: contestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('*')
      .order('name', { ascending: true });

    if (contestantsError) {
      console.error('Error fetching contestants:', contestantsError);
      return res.status(500).json({ error: 'Failed to fetch contestants' });
    }

    // For each contestant, find their elimination episode (if any)
    const { data: eliminationEvents, error: eventsError } = await supabase
      .from('contestant_events')
      .select(`
        contestant_id,
        episodes!inner(episode_number),
        event_types!inner(name)
      `)
      .in('event_types.name', ['eliminated', 'eliminated_medical']);

    if (eventsError) {
      console.error('Error fetching elimination events:', eventsError);
      return res.status(500).json({ error: 'Failed to fetch elimination events' });
    }

    // Build a map of contestant_id -> elimination_episode_number
    const eliminationMap = {};
    eliminationEvents.forEach(event => {
      eliminationMap[event.contestant_id] = event.episodes.episode_number;
    });

    // Filter contestants: include only those who were NOT eliminated or were eliminated AFTER the target episode
    const filteredContestants = contestants.filter(contestant => {
      const eliminationEpisode = eliminationMap[contestant.id];

      // If no elimination event, include the contestant
      if (!eliminationEpisode) {
        return true;
      }

      // Include if they were eliminated in the current episode or after
      return eliminationEpisode >= targetEpisodeNumber;
    });

    res.json(filteredContestants);
  } catch (error) {
    console.error('Error in getAllContestants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add new contestant
 * @route POST /api/contestants
 * @access Admin only
 */
async function addContestant(req, res) {
  try {
    const { name, profession, image_url } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data, error } = await supabase
      .from('contestants')
      .insert([
        {
          name,
          profession: profession || null,
          image_url: image_url || null,
          total_score: 0,
          is_eliminated: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding contestant:', error);
      return res.status(500).json({ error: 'Failed to add contestant' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in addContestant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update contestant information
 * @route PUT /api/contestants/:id
 * @access Admin only
 */
async function updateContestant(req, res) {
  try {
    const { id } = req.params;
    const { name, profession, image_url, is_eliminated, current_tribe } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (profession !== undefined) updates.profession = profession;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_eliminated !== undefined) updates.is_eliminated = is_eliminated;
    if (current_tribe !== undefined) updates.current_tribe = current_tribe;

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Check if contestant is being marked as eliminated
    const wasEliminatedNow = is_eliminated === true;

    const { data, error } = await supabase
      .from('contestants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contestant:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Contestant not found' });
      }
      return res.status(500).json({ error: 'Failed to update contestant' });
    }

    // If contestant was marked as eliminated, trigger draft pick replacement
    if (wasEliminatedNow) {
      try {
        const replacements = await replaceEliminatedDraftPicks(parseInt(id));
        
        if (replacements.length > 0) {
          console.log(`Replaced ${replacements.length} draft pick(s) for eliminated contestant ${id}`);
          
          // Include replacement info in response
          return res.json({
            ...data,
            replacements: replacements.map(r => ({
              playerId: r.playerId,
              playerName: r.playerName,
              newContestantId: r.replacementContestantId
            }))
          });
        }
      } catch (replacementError) {
        // Log error but don't fail the request - contestant was still updated
        console.error('Error replacing draft picks:', replacementError);
        // Continue to return the updated contestant
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error in updateContestant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get detailed score breakdown for a contestant
 * @route GET /api/contestants/:id/score-breakdown
 * @access Protected
 */
async function getScoreBreakdown(req, res) {
  try {
    const { id } = req.params;

    // Verify contestant exists
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name, image_url, total_score')
      .eq('id', id)
      .single();

    if (contestantError || !contestant) {
      return res.status(404).json({ error: 'Contestant not found' });
    }

    // Fetch all episode scores with events for this contestant
    const { data: episodeScores, error: scoresError } = await supabase
      .from('episode_scores')
      .select(`
        episode_id,
        score,
        episodes!inner(episode_number)
      `)
      .eq('contestant_id', id)
      .order('episodes.episode_number', { ascending: true });

    if (scoresError) {
      console.error('Error fetching episode scores:', scoresError);
      return res.status(500).json({ error: 'Failed to fetch episode scores' });
    }

    // Fetch all events for this contestant
    const { data: events, error: eventsError } = await supabase
      .from('contestant_events')
      .select(`
        id,
        episode_id,
        point_value,
        event_types!inner(
          id,
          name,
          display_name
        ),
        episodes!inner(episode_number)
      `)
      .eq('contestant_id', id)
      .order('episodes.episode_number', { ascending: true });

    if (eventsError) {
      console.error('Error fetching contestant events:', eventsError);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    // Group events by episode
    const eventsByEpisode = {};
    events.forEach(event => {
      const episodeId = event.episode_id;
      if (!eventsByEpisode[episodeId]) {
        eventsByEpisode[episodeId] = [];
      }
      eventsByEpisode[episodeId].push({
        event_type: event.event_types.name,
        display_name: event.event_types.display_name,
        points: event.point_value
      });
    });

    // Build episode breakdown
    const episodes = episodeScores.map(episodeScore => {
      const episodeEvents = eventsByEpisode[episodeScore.episode_id] || [];
      return {
        episode_number: episodeScore.episodes.episode_number,
        events: episodeEvents,
        total: episodeScore.score
      };
    });

    // Return structured breakdown
    res.json({
      contestant: {
        id: contestant.id,
        name: contestant.name,
        image_url: contestant.image_url,
        total_score: contestant.total_score
      },
      episodes
    });
  } catch (error) {
    console.error('Error in getScoreBreakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all events for a contestant across all episodes
 * @route GET /api/contestants/:id/events
 * @access Protected
 */
async function getContestantEvents(req, res) {
  try {
    const { id } = req.params;

    // Verify contestant exists
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name')
      .eq('id', id)
      .single();

    if (contestantError || !contestant) {
      return res.status(404).json({ error: 'Contestant not found' });
    }

    // Fetch all contestant_events for this contestant
    const { data: events, error: eventsError } = await supabase
      .from('contestant_events')
      .select(`
        id,
        episode_id,
        point_value,
        created_at,
        event_types!inner(
          id,
          name,
          display_name
        ),
        episodes!inner(
          id,
          episode_number
        )
      `)
      .eq('contestant_id', id)
      .order('episodes.episode_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('Error fetching contestant events:', eventsError);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    // Format the response
    const formattedEvents = (events || []).map(event => ({
      id: event.id,
      episode_id: event.episode_id,
      episode_number: event.episodes.episode_number,
      event_type: event.event_types.name,
      event_display_name: event.event_types.display_name,
      points: event.point_value,
      created_at: event.created_at
    }));

    res.json({
      contestant: {
        id: contestant.id,
        name: contestant.name
      },
      events: formattedEvents
    });
  } catch (error) {
    console.error('Error in getContestantEvents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get contestant performance data with metrics and trends
 * @route GET /api/contestants/performance
 * @access Protected
 */
async function getContestantPerformance(req, res) {
  try {
    // Fetch all contestants with basic info
    const { data: rawContestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('id, name, image_url, total_score, profession, is_eliminated');

    if (contestantsError) {
      console.error('Error fetching contestants:', contestantsError);
      return res.status(500).json({ error: 'Failed to fetch contestants' });
    }

    // Sort contestants by total_score descending, with null values last
    const contestants = rawContestants.sort((a, b) => {
      // Handle null values - put them at the end
      if (a.total_score === null && b.total_score === null) return 0;
      if (a.total_score === null) return 1;
      if (b.total_score === null) return -1;
      
      // Normal descending sort for non-null values
      return b.total_score - a.total_score;
    });

    // Fetch all episode scores for all contestants to calculate episodes participated
    const { data: episodeScores, error: scoresError } = await supabase
      .from('episode_scores')
      .select(`
        contestant_id,
        score,
        episodes!inner(
          id,
          episode_number
        )
      `)
      .order('episodes(episode_number)', { ascending: true });

    if (scoresError) {
      console.error('Error fetching episode scores:', scoresError);
      return res.status(500).json({ error: 'Failed to fetch episode scores' });
    }

    // Fetch event counts for all contestants with enhanced error handling
    let eventCounts = {};
    
    // Helper function to safely fetch event counts by type
    const fetchEventCountsByType = async (eventTypeName, countKey) => {
      try {
        const { data: events, error } = await supabase
          .from('contestant_events')
          .select(`
            contestant_id,
            event_types!inner(name)
          `)
          .eq('event_types.name', eventTypeName);

        if (error) {
          console.warn(`Error fetching ${eventTypeName} events:`, error);
          return false; // Indicate failure
        }

        // Process events if query succeeded
        if (events && Array.isArray(events)) {
          events.forEach(event => {
            if (event.contestant_id) {
              if (!eventCounts[event.contestant_id]) {
                eventCounts[event.contestant_id] = { idols_found: 0, reward_wins: 0, immunity_wins: 0 };
              }
              eventCounts[event.contestant_id][countKey]++;
            }
          });
          return true; // Indicate success
        }
        
        return false;
      } catch (error) {
        console.warn(`Exception while fetching ${eventTypeName} events:`, error);
        return false;
      }
    };

    // Attempt to fetch each event type with individual error handling
    try {
      // Check if event_types table exists and has the required event types
      const { data: eventTypes, error: eventTypesError } = await supabase
        .from('event_types')
        .select('name')
        .in('name', ['found_hidden_idol', 'team_reward_win', 'team_immunity_win']);

      if (eventTypesError) {
        console.warn('Error checking event types:', eventTypesError);
        console.warn('Event counts will be set to zero for all contestants');
      } else {
        const availableEventTypes = eventTypes?.map(et => et.name) || [];
        
        // Only fetch event counts for event types that exist
        if (availableEventTypes.includes('found_hidden_idol')) {
          const success = await fetchEventCountsByType('found_hidden_idol', 'idols_found');
          if (!success) {
            console.warn('Failed to fetch idol events, continuing with zero counts');
          }
        } else {
          console.warn('Event type "found_hidden_idol" not found in database');
        }

        if (availableEventTypes.includes('team_reward_win')) {
          const success = await fetchEventCountsByType('team_reward_win', 'reward_wins');
          if (!success) {
            console.warn('Failed to fetch reward events, continuing with zero counts');
          }
        } else {
          console.warn('Event type "team_reward_win" not found in database');
        }

        if (availableEventTypes.includes('team_immunity_win')) {
          const success = await fetchEventCountsByType('team_immunity_win', 'immunity_wins');
          if (!success) {
            console.warn('Failed to fetch immunity events, continuing with zero counts');
          }
        } else {
          console.warn('Event type "team_immunity_win" not found in database');
        }
      }
    } catch (eventError) {
      console.warn('Error in event count aggregation:', eventError);
      console.warn('Continuing with empty event counts');
      // eventCounts remains empty object, which will result in zero counts for all contestants
    }

    // Group episode scores by contestant to count episodes participated
    const scoresByContestant = {};
    episodeScores.forEach(score => {
      if (!scoresByContestant[score.contestant_id]) {
        scoresByContestant[score.contestant_id] = [];
      }
      scoresByContestant[score.contestant_id].push({
        episode_number: score.episodes.episode_number,
        score: score.score
      });
    });

    // Calculate performance trends for all contestants efficiently
    const contestantIds = contestants.map(c => c.id);
    const trends = await calculateMultipleContestantTrends(contestantIds);

    // Calculate performance metrics for each contestant
    const performanceData = contestants.map((contestant, index) => {
      const contestantScores = scoresByContestant[contestant.id] || [];
      const episodesParticipated = contestantScores.length;
      
      // Calculate average points per episode
      let averagePerEpisode = null;
      if (episodesParticipated > 0) {
        averagePerEpisode = parseFloat((contestant.total_score / episodesParticipated).toFixed(1));
      }

      // Get event counts for this contestant with enhanced error handling
      const contestantEvents = eventCounts[contestant.id] || { idols_found: 0, reward_wins: 0, immunity_wins: 0 };
      
      // Ensure all event count fields are valid numbers (handle any data corruption)
      const safeEventCounts = {
        idols_found: Number.isInteger(contestantEvents.idols_found) && contestantEvents.idols_found >= 0 
          ? contestantEvents.idols_found : 0,
        reward_wins: Number.isInteger(contestantEvents.reward_wins) && contestantEvents.reward_wins >= 0 
          ? contestantEvents.reward_wins : 0,
        immunity_wins: Number.isInteger(contestantEvents.immunity_wins) && contestantEvents.immunity_wins >= 0 
          ? contestantEvents.immunity_wins : 0
      };

      return {
        id: contestant.id,
        name: contestant.name,
        image_url: contestant.image_url,
        total_score: contestant.total_score,
        average_per_episode: averagePerEpisode,
        trend: trends[contestant.id] || 'n/a',
        episodes_participated: episodesParticipated,
        is_eliminated: contestant.is_eliminated,
        profession: contestant.profession,
        rank: index + 1,
        idols_found: safeEventCounts.idols_found,
        reward_wins: safeEventCounts.reward_wins,
        immunity_wins: safeEventCounts.immunity_wins
      };
    });

    res.json({ data: performanceData });
  } catch (error) {
    console.error('Error in getContestantPerformance:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Internal server error';
    
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      errorMessage = 'Database schema error: Required tables not found';
      console.error('Database schema issue detected:', error.message);
    } else if (error.code === 'PGRST301') {
      errorMessage = 'Database connection error';
      console.error('Database connection issue:', error);
    } else if (error.code && error.code.startsWith('PGRST')) {
      errorMessage = 'Database query error';
      console.error('Database query issue:', error);
    }
    
    res.status(500).json({ 
      error: errorMessage,
      // Include additional context in development
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    });
  }
}

/**
 * Manually trigger draft pick replacement for eliminated contestants
 * @route POST /api/contestants/fix-eliminations
 * @access Admin only
 */
async function fixEliminatedDraftPicks(req, res) {
  try {
    // Find all eliminated contestants who still have draft picks
    const { data: eliminatedWithPicks, error: queryError } = await supabase
      .from('draft_picks')
      .select(`
        contestant_id,
        contestants!inner(name, is_eliminated)
      `)
      .eq('contestants.is_eliminated', true);

    if (queryError) {
      console.error('Error finding eliminated draft picks:', queryError);
      return res.status(500).json({ error: 'Failed to find eliminated draft picks' });
    }

    if (!eliminatedWithPicks || eliminatedWithPicks.length === 0) {
      return res.json({ 
        message: 'No eliminated contestants found with active draft picks',
        replacements: []
      });
    }

    // Get unique eliminated contestant IDs
    const eliminatedContestantIds = [...new Set(eliminatedWithPicks.map(p => p.contestant_id))];
    
    console.log('Found eliminated contestants with draft picks:', eliminatedContestantIds);

    // Process replacements for each eliminated contestant
    const allReplacements = [];
    for (const contestantId of eliminatedContestantIds) {
      try {
        const replacements = await replaceEliminatedDraftPicks(contestantId);
        allReplacements.push(...replacements);
        console.log(`Processed replacements for contestant ${contestantId}:`, replacements);
      } catch (error) {
        console.error(`Error replacing picks for contestant ${contestantId}:`, error);
      }
    }

    res.json({
      message: `Processed ${eliminatedContestantIds.length} eliminated contestants`,
      eliminatedContestants: eliminatedContestantIds,
      replacements: allReplacements.map(r => ({
        playerId: r.playerId,
        playerName: r.playerName,
        eliminatedContestantId: r.eliminatedContestantId,
        newContestantId: r.replacementContestantId
      }))
    });

  } catch (error) {
    console.error('Error in fixEliminatedDraftPicks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getAllContestants,
  addContestant,
  updateContestant,
  getScoreBreakdown,
  getContestantEvents,
  getContestantPerformance,
  fixEliminatedDraftPicks
};
