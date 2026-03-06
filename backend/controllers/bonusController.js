const supabase = require('../db/supabase');
const { clearLeaderboardCache } = require('./leaderboardController');

/**
 * Get all bonuses (admin only)
 * @route GET /api/bonuses
 */
async function getAllBonuses(req, res) {
  try {
    const { data, error } = await supabase
      .from('player_bonuses')
      .select(`
        id,
        amount,
        reason,
        created_at,
        player:player_id (id, name),
        episode:episode_id (id, episode_number),
        created_by_player:created_by (id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch bonuses' });
  }
}

/**
 * Get bonuses for a specific player
 * @route GET /api/bonuses/player/:playerId
 */
async function getPlayerBonuses(req, res) {
  const { playerId } = req.params;

  try {
    const { data, error } = await supabase
      .from('player_bonuses')
      .select(`
        id,
        amount,
        reason,
        created_at,
        episode:episode_id (id, episode_number)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching player bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch player bonuses' });
  }
}

/**
 * Create a bonus for a player (admin only)
 * @route POST /api/bonuses
 * Body: { player_id, amount, reason, episode_id? }
 */
async function createBonus(req, res) {
  const { player_id, amount, reason, episode_id } = req.body;

  if (!player_id || amount === undefined || !reason) {
    return res.status(400).json({ error: 'player_id, amount, and reason are required' });
  }

  if (!Number.isInteger(amount)) {
    return res.status(400).json({ error: 'amount must be an integer' });
  }

  try {
    const { data, error } = await supabase
      .from('player_bonuses')
      .insert({
        player_id,
        amount,
        reason,
        episode_id: episode_id || null,
        created_by: req.user.id
      })
      .select(`
        id,
        amount,
        reason,
        created_at,
        player:player_id (id, name),
        episode:episode_id (id, episode_number)
      `)
      .single();

    if (error) throw error;

    clearLeaderboardCache();
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating bonus:', error);
    res.status(500).json({ error: 'Failed to create bonus' });
  }
}

/**
 * Delete a bonus (admin only)
 * @route DELETE /api/bonuses/:id
 */
async function deleteBonus(req, res) {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('player_bonuses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    clearLeaderboardCache();
    res.json({ message: 'Bonus deleted successfully' });
  } catch (error) {
    console.error('Error deleting bonus:', error);
    res.status(500).json({ error: 'Failed to delete bonus' });
  }
}

module.exports = { getAllBonuses, getPlayerBonuses, createBonus, deleteBonus };
