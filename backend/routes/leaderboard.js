const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getLeaderboard } = require('../controllers/leaderboardController');

// Get leaderboard (requires authentication)
router.get('/', authenticateToken, getLeaderboard);

module.exports = router;
