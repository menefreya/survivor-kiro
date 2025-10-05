const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { updateSoleSurvivor } = require('../controllers/soleSurvivorController');

// Update sole survivor pick (requires authentication)
router.put('/:playerId', authenticateToken, updateSoleSurvivor);

module.exports = router;
