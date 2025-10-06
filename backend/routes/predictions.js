const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getPredictionStatus,
  submitPredictions,
  getCurrentPredictions,
  getPredictionHistory,
  getEpisodePredictions,
  togglePredictionLock,
  getPredictionStatistics
} = require('../controllers/predictionController');

/**
 * Prediction routes
 * All routes require authentication
 * Admin routes require admin privileges
 */

// Get prediction status for current episode
router.get('/status', authenticateToken, getPredictionStatus);

// Submit predictions for current episode
router.post('/', authenticateToken, submitPredictions);

// Get current user's predictions for current episode
router.get('/current', authenticateToken, getCurrentPredictions);

// Get prediction history for current user
router.get('/history', authenticateToken, getPredictionHistory);

// Get prediction statistics (admin only)
router.get('/statistics', authenticateToken, requireAdmin, getPredictionStatistics);

// Get all predictions for an episode (admin only)
router.get('/episodes/:episodeId', authenticateToken, requireAdmin, getEpisodePredictions);

// Lock or unlock predictions for an episode (admin only)
router.put('/episodes/:episodeId/lock', authenticateToken, requireAdmin, togglePredictionLock);

module.exports = router;
