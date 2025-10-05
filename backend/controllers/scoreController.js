const supabase = require('../db/supabase');

/**
 * Add episode scores for all contestants
 * @route POST /api/scores
 * @access Admin only
 */
async function addEpisodeScores(req, res) {
  try {
    const { episode_number, scores } = req.body;

    // Validate required fields
    if (!episode_number || !scores || !Array.isArray(scores)) {
      return res.status(400).json({ 
        error: 'Episode number and scores array are required' 
      });
    }

    // Validate episode number is a positive integer
    if (!Number.isInteger(episode_number) || episode_number <= 0) {
      return res.status(400).json({ 
        error: 'Episode number must be a positive integer' 
      });
    }

    // Validate scores array format
    for (const score of scores) {
      if (!score.contestant_id || typeof score.score !== 'number') {
        return res.status(400).json({ 
          error: 'Each score must have contestant_id and numeric score value' 
        });
      }
    }

    // Check if episode already exists
    const { data: existingEpisode } = await supabase
      .from('episodes')
      .select('id')
      .eq('episode_number', episode_number)
      .single();

    if (existingEpisode) {
      return res.status(400).json({ 
        error: `Episode ${episode_number} scores have already been added` 
      });
    }

    // Create episode record
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .insert([{ episode_number }])
      .select()
      .single();

    if (episodeError) {
      console.error('Error creating episode:', episodeError);
      return res.status(500).json({ error: 'Failed to create episode record' });
    }

    // Prepare episode scores for insertion
    const episodeScores = scores.map(score => ({
      episode_id: episode.id,
      contestant_id: score.contestant_id,
      score: score.score
    }));

    // Insert episode scores
    const { data: insertedScores, error: scoresError } = await supabase
      .from('episode_scores')
      .insert(episodeScores)
      .select();

    if (scoresError) {
      console.error('Error inserting episode scores:', scoresError);
      // Rollback: delete the episode if scores insertion fails
      await supabase.from('episodes').delete().eq('id', episode.id);
      return res.status(500).json({ error: 'Failed to add episode scores' });
    }

    // Update each contestant's total_score
    for (const score of scores) {
      const { error: updateError } = await supabase.rpc('increment_contestant_score', {
        contestant_id_param: score.contestant_id,
        score_increment: score.score
      });

      // If RPC doesn't exist, fall back to manual update
      if (updateError && updateError.code === '42883') {
        // Fetch current total
        const { data: contestant } = await supabase
          .from('contestants')
          .select('total_score')
          .eq('id', score.contestant_id)
          .single();

        if (contestant) {
          await supabase
            .from('contestants')
            .update({ total_score: contestant.total_score + score.score })
            .eq('id', score.contestant_id);
        }
      } else if (updateError) {
        console.error('Error updating contestant score:', updateError);
      }
    }

    res.status(201).json({
      message: 'Episode scores added successfully',
      episode,
      scores: insertedScores
    });
  } catch (error) {
    console.error('Error in addEpisodeScores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all contestant scores
 * @route GET /api/scores/contestants
 * @access Protected
 */
async function getContestantScores(req, res) {
  try {
    const { data, error } = await supabase
      .from('contestants')
      .select('id, name, profession, image_url, total_score, is_eliminated')
      .order('total_score', { ascending: false });

    if (error) {
      console.error('Error fetching contestant scores:', error);
      return res.status(500).json({ error: 'Failed to fetch contestant scores' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getContestantScores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  addEpisodeScores,
  getContestantScores
};
