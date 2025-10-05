const supabase = require('../db/supabase');

/**
 * Update sole survivor pick for a player
 * PUT /api/sole-survivor/:playerId
 */
async function updateSoleSurvivor(req, res) {
  try {
    const { playerId } = req.params;
    const { contestant_id } = req.body;
    const userId = req.user.id;

    // Ensure user can only update their own sole survivor pick (unless admin)
    if (parseInt(playerId) !== userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'You can only update your own sole survivor pick' 
      });
    }

    // Validate contestant_id is provided
    if (!contestant_id) {
      return res.status(400).json({ 
        error: 'contestant_id is required' 
      });
    }

    // Verify contestant exists
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name, is_eliminated')
      .eq('id', contestant_id)
      .single();

    if (contestantError || !contestant) {
      return res.status(404).json({ error: 'Contestant not found' });
    }

    // Per requirement 2.6: Allow sole survivor pick even if eliminated
    // This allows players to re-pick if their sole survivor is eliminated

    // Update player's sole survivor pick
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({ sole_survivor_id: contestant_id })
      .eq('id', playerId)
      .select('id, email, name, profile_image_url, is_admin, has_submitted_rankings, sole_survivor_id')
      .single();

    if (updateError) {
      console.error('Update sole survivor error:', updateError);
      return res.status(500).json({ error: 'Failed to update sole survivor pick' });
    }

    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      message: 'Sole survivor pick updated successfully',
      player: updatedPlayer,
      contestant: {
        id: contestant.id,
        name: contestant.name,
        is_eliminated: contestant.is_eliminated
      }
    });
  } catch (error) {
    console.error('Update sole survivor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  updateSoleSurvivor
};
