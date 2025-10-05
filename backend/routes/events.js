const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Event recording routes
 * All routes require authentication
 * POST, DELETE routes require admin privileges
 */

// Get all events for an episode
router.get(
  '/episodes/:episodeId/events',
  authenticateToken,
  eventController.getEpisodeEvents
);

// Add events for an episode
router.post(
  '/episodes/:episodeId/events',
  authenticateToken,
  requireAdmin,
  eventController.addEvents
);

// Bulk update events (add and remove)
router.post(
  '/episodes/:episodeId/events/bulk',
  authenticateToken,
  requireAdmin,
  eventController.bulkUpdateEvents
);

// Delete a specific event
router.delete(
  '/episodes/:episodeId/events/:eventId',
  authenticateToken,
  requireAdmin,
  eventController.deleteEvent
);

module.exports = router;
