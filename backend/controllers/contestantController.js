const supabase = require('../db/supabase');

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

    res.json(data);
  } catch (error) {
    console.error('Error in updateContestant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getAllContestants,
  addContestant,
  updateContestant
};
