const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllContestants,
  addContestant,
  updateContestant
} = require('../controllers/contestantController');

// Get all contestants (requires authentication)
router.get('/', authenticateToken, getAllContestants);

// Add new contestant (requires admin)
router.post('/', authenticateToken, requireAdmin, addContestant);

// Update contestant (requires admin)
router.put('/:id', authenticateToken, requireAdmin, updateContestant);

module.exports = router;
