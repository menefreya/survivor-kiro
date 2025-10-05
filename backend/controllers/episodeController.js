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
