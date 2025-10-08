const supabase = require('../db/supabase');

/**
 * Get all players
 * GET /api/players
 */
async function getAllPlayers(req, res) {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, email, name, profile_image_url, is_admin, has_submitted_rankings, sole_survivor_id')
      .order('name', { ascending: true });

    if (error) {
      console.error('Get all players error:', error);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    res.json({ players });
  } catch (error) {
    console.error('Get all players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get player details by ID
 * GET /api/players/:id
 */
async function getPlayerById(req, res) {
  try {
    const { id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select('id, email, name, profile_image_url, is_admin, has_submitted_rankings, sole_survivor_id')
      .eq('id', id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ player });
  } catch (error) {
    console.error('Get player by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update player profile (name and/or profile_image_url)
 * PUT /api/players/:id
 */
async function updatePlayerProfile(req, res) {
  try {
    const { id } = req.params;
    const { profile_image_url, name } = req.body;
    const userId = req.user.id;

    // Ensure user can only update their own profile (unless admin)
    if (parseInt(id) !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'You can only update your own profile'
      });
    }

    // Validate at least one field is provided
    if (profile_image_url === undefined && name === undefined) {
      return res.status(400).json({
        error: 'At least one field (name or profile_image_url) is required'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (profile_image_url !== undefined) {
      updateData.profile_image_url = profile_image_url;
    }
    if (name !== undefined) {
      updateData.name = name;
    }

    // Update player profile
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select('id, email, name, profile_image_url, is_admin, has_submitted_rankings, sole_survivor_id')
      .single();

    if (error) {
      console.error('Update player profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Update player profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get player's sole survivor selection history
 * GET /api/players/:playerId/sole-survivor-history
 */
async function getSoleSurvivorHistory(req, res) {
  try {
    const { playerId } = req.params;

    // Validate player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fetch all sole_survivor_history records for player with contestant details
    const { data: history, error: historyError } = await supabase
      .from('sole_survivor_history')
      .select(`
        id,
        player_id,
        contestant_id,
        start_episode,
        end_episode,
        created_at,
        contestants (
          id,
          name,
          age,
          hometown,
          occupation,
          image_url,
          total_score,
          is_eliminated,
          is_winner
        )
      `)
      .eq('player_id', playerId)
      .order('start_episode', { ascending: false });

    if (historyError) {
      console.error('Error fetching sole survivor history:', historyError);
      return res.status(500).json({ error: 'Failed to fetch sole survivor history' });
    }

    res.json({
      player_id: parseInt(playerId),
      history: history || []
    });
  } catch (error) {
    console.error('Get sole survivor history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update player's sole survivor selection
 * POST /api/players/:playerId/sole-survivor
 */
async function updateSoleSurvivor(req, res) {
  try {
    const { playerId } = req.params;
    const { contestant_id } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Authorization: player can update own, admin can update any
    if (parseInt(playerId) !== userId && !isAdmin) {
      return res.status(403).json({ 
        error: 'You can only update your own sole survivor' 
      });
    }

    // Validate contestant_id is provided
    if (!contestant_id) {
      return res.status(400).json({ 
        error: 'contestant_id is required' 
      });
    }

    // Validate contestant exists
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name, is_eliminated')
      .eq('id', contestant_id)
      .single();

    if (contestantError || !contestant) {
      return res.status(404).json({ error: 'Contestant not found' });
    }

    // Get current episode number (find the episode marked as is_current)
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('episode_number')
      .eq('is_current', true)
      .single();

    // Default to episode 1 if no current episode is set
    const currentEpisodeNumber = currentEpisode?.episode_number || 1;

    // Get player's current sole survivor to check if it's changing
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('sole_survivor_id')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // If the contestant is the same as current, no change needed
    if (player.sole_survivor_id === parseInt(contestant_id)) {
      return res.json({
        message: 'Sole survivor is already set to this contestant',
        sole_survivor_id: contestant_id
      });
    }

    // End previous selection if exists
    if (player.sole_survivor_id) {
      const { error: endError } = await supabase
        .from('sole_survivor_history')
        .update({ end_episode: currentEpisodeNumber })
        .eq('player_id', playerId)
        .is('end_episode', null);

      if (endError) {
        console.error('Error ending previous sole survivor selection:', endError);
        return res.status(500).json({ error: 'Failed to update sole survivor history' });
      }
    }

    // Create new selection record
    const { error: historyError } = await supabase
      .from('sole_survivor_history')
      .insert({
        player_id: playerId,
        contestant_id: contestant_id,
        start_episode: currentEpisodeNumber,
        end_episode: null
      });

    if (historyError) {
      console.error('Error creating sole survivor history:', historyError);
      return res.status(500).json({ error: 'Failed to create sole survivor history' });
    }

    // Update players.sole_survivor_id
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({ sole_survivor_id: contestant_id })
      .eq('id', playerId)
      .select('id, sole_survivor_id')
      .single();

    if (updateError) {
      console.error('Error updating player sole survivor:', updateError);
      return res.status(500).json({ error: 'Failed to update sole survivor' });
    }

    res.json({
      message: 'Sole survivor updated successfully',
      player: updatedPlayer,
      current_episode: currentEpisodeNumber
    });
  } catch (error) {
    console.error('Update sole survivor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getAllPlayers,
  getPlayerById,
  updatePlayerProfile,
  getSoleSurvivorHistory,
  updateSoleSurvivor
};
