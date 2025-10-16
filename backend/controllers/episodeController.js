const supabase = require('../db/supabase');

/**
 * Get all episodes
 */
exports.getAllEpisodes = async (req, res) => {
  try {
    const { data: episodes, error } = await supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(episodes || []);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
};

/**
 * Get the current episode (most recent episode)
 */
exports.getCurrentEpisode = async (req, res) => {
  try {
    const { data: episode, error } = await supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no episodes exist yet, return null
      if (error.code === 'PGRST116') {
        return res.json(null);
      }
      throw error;
    }

    res.json(episode);
  } catch (error) {
    console.error('Error fetching current episode:', error);
    res.status(500).json({ error: 'Failed to fetch current episode' });
  }
};

/**
 * Set an episode as the current episode
 * @route PUT /api/episodes/:episodeId/set-current
 * @access Admin only
 */
exports.setCurrentEpisode = async (req, res) => {
  try {
    const { episodeId } = req.params;

    // Validate episode exists
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .eq('id', episodeId)
      .single();

    if (fetchError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // First, unset all episodes as current
    const { error: unsetError } = await supabase
      .from('episodes')
      .update({ is_current: false })
      .neq('id', 0); // Update all rows

    if (unsetError) {
      console.error('Error unsetting current episodes:', unsetError);
      return res.status(500).json({ error: 'Failed to update episodes' });
    }

    // Then set the specified episode as current
    const { data: updatedEpisode, error: setError } = await supabase
      .from('episodes')
      .update({ is_current: true })
      .eq('id', episodeId)
      .select()
      .single();

    if (setError) {
      console.error('Error setting current episode:', setError);
      return res.status(500).json({ error: 'Failed to set current episode' });
    }

    res.json({
      message: `Episode ${episode.episode_number} is now the current episode`,
      episode: updatedEpisode
    });
  } catch (error) {
    console.error('Error in setCurrentEpisode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
