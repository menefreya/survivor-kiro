const express = require('express');
const router = express.Router();
const draftPickController = require('../controllers/draftPickController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get score breakdown for a specific draft pick
router.get('/:pickId/score-breakdown', draftPickController.getDraftPickScoreBreakdown);

module.exports = router;