const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  addEpisodeScores,
  getContestantScores
} = require('../controllers/scoreController');

// Add episode scores (requires admin)
router.post('/', authenticateToken, requireAdmin, addEpisodeScores);

// Get all contestant scores (requires authentication)
router.get('/contestants', authenticateToken, getContestantScores);

module.exports = router;
