const supabase = require('../db/supabase');

/**
 * Get all active event types grouped by category
 * @route GET /api/event-types
 * @access Protected
 */
async function getEventTypes(req, res) {
  try {
    const { data, error } = await supabase
      .from('event_types')
      .select('id, name, display_name, category, point_value')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching event types:', error);
      return res.status(500).json({ error: 'Failed to fetch event types' });
    }

    // Group by category
    const grouped = {
      basic: [],
      penalty: [],
      bonus: []
    };

    data.forEach(eventType => {
      if (grouped[eventType.category]) {
        grouped[eventType.category].push(eventType);
      }
    });

    res.json(grouped);
  } catch (error) {
    console.error('Error in getEventTypes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update event type point value
 * @route PUT /api/event-types/:id
 * @access Admin only
 */
async function updateEventType(req, res) {
  try {
    const { id } = req.params;
    const { point_value } = req.body;

    // Validate point_value
    if (point_value === undefined || point_value === null) {
      return res.status(400).json({ error: 'point_value is required' });
    }

    if (typeof point_value !== 'number' || !Number.isInteger(point_value)) {
      return res.status(400).json({ error: 'point_value must be an integer' });
    }

    // Update event type
    const { data, error } = await supabase
      .from('event_types')
      .update({ point_value })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event type:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Event type not found' });
      }
      return res.status(500).json({ error: 'Failed to update event type' });
    }

    // TODO: Trigger score recalculation for affected contestants
    // This will be implemented in task 6 (Score recalculation and migration)
    console.log(`Event type ${id} updated. Score recalculation needed.`);

    res.json(data);
  } catch (error) {
    console.error('Error in updateEventType:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getEventTypes,
  updateEventType
};
