const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  addEpisodeScores,
  getContestantScores,
  recalculateAllScores,
  getEpisodes,
  createEpisode
} = require('../controllers/scoreController');

// Get all episodes (requires authentication)
router.get('/episodes', authenticateToken, getEpisodes);

// Create a new episode (requires admin)
router.post('/episodes', authenticateToken, requireAdmin, createEpisode);

// Add episode scores (requires admin)
router.post('/', authenticateToken, requireAdmin, addEpisodeScores);

// Get all contestant scores (requires authentication)
router.get('/contestants', authenticateToken, getContestantScores);

// Recalculate all scores from events (requires admin)
router.post('/recalculate', authenticateToken, requireAdmin, recalculateAllScores);

module.exports = router;
