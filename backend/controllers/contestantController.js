const supabase = require('../db/supabase');
const { replaceEliminatedDraftPicks } = require('../services/draftService');

/**
 * Get all contestants
 * @route GET /api/contestants
 * @access Protected
 */
async function getAllContestants(req, res) {
  try {
    const { data, error } = await supabase
      .from('contestants')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching contestants:', error);
      return res.status(500).json({ error: 'Failed to fetch contestants' });
    }

    res.json(data);
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
    const { name, profession, image_url, is_eliminated } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (profession !== undefined) updates.profession = profession;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_eliminated !== undefined) updates.is_eliminated = is_eliminated;

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

module.exports = {
  getAllContestants,
  addContestant,
  updateContestant,
  getScoreBreakdown,
  getContestantEvents
};
