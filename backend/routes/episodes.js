const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getAllEpisodes, getCurrentEpisode, setCurrentEpisode } = require('../controllers/episodeController');
const { getEpisodePredictions, togglePredictionLock } = require('../controllers/predictionController');

/**
 * Episode routes
 */

// Get all episodes
router.get('/', authenticateToken, getAllEpisodes);

// Get current episode
router.get('/current', authenticateToken, getCurrentEpisode);

// Set an episode as current (admin only)
router.put('/:episodeId/set-current', authenticateToken, requireAdmin, setCurrentEpisode);

// Get predictions for a specific episode (admin only)
router.get('/:episodeId/predictions', authenticateToken, requireAdmin, getEpisodePredictions);

// Lock/unlock predictions for an episode (admin only)
router.put('/:episodeId/lock-predictions', authenticateToken, requireAdmin, togglePredictionLock);

module.exports = router;
