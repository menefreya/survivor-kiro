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
 * Update player profile image
 * PUT /api/players/:id
 */
async function updatePlayerProfile(req, res) {
  try {
    const { id } = req.params;
    const { profile_image_url } = req.body;
    const userId = req.user.id;

    // Ensure user can only update their own profile (unless admin)
    if (parseInt(id) !== userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'You can only update your own profile' 
      });
    }

    // Validate profile_image_url is provided
    if (profile_image_url === undefined) {
      return res.status(400).json({ 
        error: 'profile_image_url is required' 
      });
    }

    // Update player profile image
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update({ profile_image_url })
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

module.exports = {
  getAllPlayers,
  getPlayerById,
  updatePlayerProfile
};
