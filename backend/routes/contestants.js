const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllContestants,
  addContestant,
  updateContestant,
  getScoreBreakdown,
  getContestantEvents,
  getContestantPerformance,
  fixEliminatedDraftPicks
} = require('../controllers/contestantController');

// Get all contestants (requires authentication)
router.get('/', authenticateToken, getAllContestants);

// Get contestant performance data (requires authentication)
router.get('/performance', authenticateToken, getContestantPerformance);

// Add new contestant (requires admin)
router.post('/', authenticateToken, requireAdmin, addContestant);

// Update contestant (requires admin)
router.put('/:id', authenticateToken, requireAdmin, updateContestant);

// Get contestant score breakdown (requires authentication)
router.get('/:id/score-breakdown', authenticateToken, getScoreBreakdown);

// Get all events for a contestant (requires authentication)
router.get('/:id/events', authenticateToken, getContestantEvents);

// Fix eliminated draft picks (requires admin)
router.post('/fix-eliminations', authenticateToken, requireAdmin, fixEliminatedDraftPicks);

module.exports = router;
