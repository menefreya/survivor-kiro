const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllPlayers,
  getPlayerById,
  updatePlayerProfile,
  getSoleSurvivorHistory,
  updateSoleSurvivor
} = require('../controllers/playerController');
const { getPlayerDraftPicksBreakdown } = require('../controllers/draftPickController');

// All player routes require authentication
router.get('/', authenticateToken, getAllPlayers);
router.get('/:id', authenticateToken, getPlayerById);
router.put('/:id', authenticateToken, updatePlayerProfile);

// Sole survivor routes
router.get('/:playerId/sole-survivor-history', authenticateToken, getSoleSurvivorHistory);
router.post('/:playerId/sole-survivor', authenticateToken, updateSoleSurvivor);

// Draft picks routes
router.get('/:playerId/draft-picks-breakdown', authenticateToken, getPlayerDraftPicksBreakdown);

module.exports = router;
