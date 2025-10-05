const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllContestants,
  addContestant,
  updateContestant,
  getScoreBreakdown,
  getContestantEvents
} = require('../controllers/contestantController');

// Get all contestants (requires authentication)
router.get('/', authenticateToken, getAllContestants);

// Add new contestant (requires admin)
router.post('/', authenticateToken, requireAdmin, addContestant);

// Update contestant (requires admin)
router.put('/:id', authenticateToken, requireAdmin, updateContestant);

// Get contestant score breakdown (requires authentication)
router.get('/:id/score-breakdown', authenticateToken, getScoreBreakdown);

// Get all events for a contestant (requires authentication)
router.get('/:id/events', authenticateToken, getContestantEvents);

module.exports = router;
