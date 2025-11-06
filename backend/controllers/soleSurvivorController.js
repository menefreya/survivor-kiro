const supabase = require('../db/supabase');
const { replaceDraftPickForSoleSurvivor } = require('../services/draftService');

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

    // Check if the new sole survivor is currently a draft pick and replace if needed
    let draftReplacement = null;
    try {
      draftReplacement = await replaceDraftPickForSoleSurvivor(playerId, contestant_id);
    } catch (replacementError) {
      console.error('Error replacing draft pick for sole survivor:', replacementError);
      return res.status(500).json({
        error: 'Failed to replace draft pick. Please try again.'
      });
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

    // Prepare response with replacement info if applicable
    const response = {
      message: 'Sole survivor pick updated successfully',
      player: updatedPlayer,
      contestant: {
        id: contestant.id,
        name: contestant.name,
        is_eliminated: contestant.is_eliminated
      }
    };

    // Include draft replacement info if a replacement occurred
    if (draftReplacement) {
      response.draft_replacement = {
        replaced_contestant: {
          id: draftReplacement.originalContestantId,
          name: draftReplacement.originalContestantName
        },
        new_draft_pick: {
          id: draftReplacement.replacementContestantId,
          name: draftReplacement.replacementContestantName
        },
        episode: draftReplacement.episodeNumber
      };
      response.message += ` Your draft pick has been automatically replaced with ${draftReplacement.replacementContestantName}.`;
    }

    res.json(response);
  } catch (error) {
    console.error('Update sole survivor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  updateSoleSurvivor
};
