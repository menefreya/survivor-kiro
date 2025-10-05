const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getAllEpisodes, getCurrentEpisode } = require('../controllers/episodeController');
const { getEpisodePredictions, togglePredictionLock } = require('../controllers/predictionController');

/**
 * Episode routes
 */

// Get all episodes
router.get('/', authenticateToken, getAllEpisodes);

// Get current episode
router.get('/current', authenticateToken, getCurrentEpisode);

// Get predictions for a specific episode (admin only)
router.get('/:episodeId/predictions', authenticateToken, requireAdmin, getEpisodePredictions);

// Lock/unlock predictions for an episode (admin only)
router.put('/:episodeId/lock-predictions', authenticateToken, requireAdmin, togglePredictionLock);

module.exports = router;
