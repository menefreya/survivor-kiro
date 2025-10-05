const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  saveRankings,
  getPlayerRankings
} = require('../controllers/rankingController');

// Save player rankings (requires authentication)
router.post('/', authenticateToken, saveRankings);

// Get player's rankings (requires authentication)
router.get('/:playerId', authenticateToken, getPlayerRankings);

module.exports = router;
