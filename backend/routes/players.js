const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllPlayers,
  getPlayerById,
  updatePlayerProfile
} = require('../controllers/playerController');

// All player routes require authentication
router.get('/', authenticateToken, getAllPlayers);
router.get('/:id', authenticateToken, getPlayerById);
router.put('/:id', authenticateToken, updatePlayerProfile);

module.exports = router;
