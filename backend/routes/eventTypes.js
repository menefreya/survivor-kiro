const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getEventTypes,
  updateEventType
} = require('../controllers/eventTypeController');

// Get all active event types (requires authentication)
router.get('/', authenticateToken, getEventTypes);

// Update event type point value (requires admin)
router.put('/:id', authenticateToken, requireAdmin, updateEventType);

module.exports = router;
