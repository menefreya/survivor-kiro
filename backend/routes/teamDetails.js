const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  getTeamDetailsForEpisode, 
  getAllEpisodesWithTeamSummary,
  getAllPlayers,
  getTeamAuditData
} = require('../controllers/teamDetailsController');

// Get all players (admin only)
router.get('/players', authenticateToken, getAllPlayers);

// Get audit data for all episodes
router.get('/audit', authenticateToken, getTeamAuditData);

// Get all episodes with team summary
router.get('/', authenticateToken, getAllEpisodesWithTeamSummary);

// Get team details for specific episode
router.get('/:episodeId', authenticateToken, getTeamDetailsForEpisode);

module.exports = router;