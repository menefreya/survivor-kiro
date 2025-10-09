const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getLeaderboard, recalculateScores } = require('../controllers/leaderboardController');

// Get leaderboard (requires authentication)
router.get('/', authenticateToken, getLeaderboard);

// Recalculate all scores (admin only)
router.post('/recalculate', authenticateToken, requireAdmin, recalculateScores);

module.exports = router;
