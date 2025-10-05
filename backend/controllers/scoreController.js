const supabase = require('../db/supabase');
const ScoreCalculationService = require('../services/scoreCalculationService');

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

/**
 * Recalculate all scores from events
 * @route POST /api/scores/recalculate
 * @access Admin only
 */
async function recalculateAllScores(req, res) {
  try {
    // Fetch all episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .order('episode_number', { ascending: true });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    // Fetch all contestants
    const { data: contestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('id, name');

    if (contestantsError) {
      console.error('Error fetching contestants:', contestantsError);
      return res.status(500).json({ error: 'Failed to fetch contestants' });
    }

    const summary = {
      episodes_processed: 0,
      contestants_updated: 0,
      scores_updated: [],
      errors: []
    };

    // Iterate through all episodes
    for (const episode of episodes) {
      // Recalculate scores from events for each contestant
      for (const contestant of contestants) {
        try {
          // Calculate episode score from events
          const episodeScore = await ScoreCalculationService.calculateEpisodeScore(
            episode.id,
            contestant.id
          );

          // Update episode_scores table
          const { data: existingScore, error: fetchError } = await supabase
            .from('episode_scores')
            .select('id, score')
            .eq('episode_id', episode.id)
            .eq('contestant_id', contestant.id)
            .maybeSingle();

          if (fetchError) {
            throw fetchError;
          }

          if (existingScore) {
            // Update existing score
            const { error: updateError } = await supabase
              .from('episode_scores')
              .update({
                score: episodeScore,
                source: 'events',
                calculated_at: new Date().toISOString()
              })
              .eq('id', existingScore.id);

            if (updateError) {
              throw updateError;
            }
          } else if (episodeScore !== 0) {
            // Insert new score only if non-zero
            const { error: insertError } = await supabase
              .from('episode_scores')
              .insert({
                episode_id: episode.id,
                contestant_id: contestant.id,
                score: episodeScore,
                source: 'events',
                calculated_at: new Date().toISOString()
              });

            if (insertError) {
              throw insertError;
            }
          }

          summary.scores_updated.push({
            episode_number: episode.episode_number,
            contestant_name: contestant.name,
            score: episodeScore
          });
        } catch (error) {
          console.error(`Error processing episode ${episode.episode_number} for contestant ${contestant.name}:`, error);
          summary.errors.push({
            episode_number: episode.episode_number,
            contestant_name: contestant.name,
            error: error.message
          });
        }
      }
      summary.episodes_processed++;
    }

    // Update contestant totals
    for (const contestant of contestants) {
      try {
        await ScoreCalculationService.updateContestantTotalScore(contestant.id);
        summary.contestants_updated++;
      } catch (error) {
        console.error(`Error updating total score for contestant ${contestant.name}:`, error);
        summary.errors.push({
          contestant_name: contestant.name,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Score recalculation complete',
      summary
    });
  } catch (error) {
    console.error('Error in recalculateAllScores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all episodes
 * @route GET /api/episodes
 * @access Protected
 */
async function getEpisodes(req, res) {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('id, episode_number, is_current, aired_date, created_at')
      .order('episode_number', { ascending: true });

    if (error) {
      console.error('Error fetching episodes:', error);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error in getEpisodes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a new episode
 * @route POST /api/scores/episodes
 * @access Admin only
 */
async function createEpisode(req, res) {
  try {
    const { episode_number, aired_date } = req.body;

    // Validate required fields
    if (!episode_number) {
      return res.status(400).json({ 
        error: 'Episode number is required' 
      });
    }

    // Validate episode number is a positive integer
    if (!Number.isInteger(episode_number) || episode_number <= 0) {
      return res.status(400).json({ 
        error: 'Episode number must be a positive integer' 
      });
    }

    // Check if episode already exists
    const { data: existingEpisode } = await supabase
      .from('episodes')
      .select('id')
      .eq('episode_number', episode_number)
      .maybeSingle();

    if (existingEpisode) {
      return res.status(400).json({ 
        error: `Episode ${episode_number} already exists` 
      });
    }

    // Create episode record
    const episodeData = { episode_number };
    if (aired_date) {
      episodeData.aired_date = aired_date;
    }

    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .insert([episodeData])
      .select()
      .single();

    if (episodeError) {
      console.error('Error creating episode:', episodeError);
      return res.status(500).json({ error: 'Failed to create episode' });
    }

    res.status(201).json(episode);
  } catch (error) {
    console.error('Error in createEpisode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  addEpisodeScores,
  getContestantScores,
  recalculateAllScores,
  getEpisodes,
  createEpisode
};
