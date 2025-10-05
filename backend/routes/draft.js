const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  triggerDraft,
  getDraftStatus
} = require('../controllers/draftController');

// Trigger draft (requires authentication and admin access)
router.post('/', authenticateToken, requireAdmin, triggerDraft);

// Get draft status (requires authentication)
router.get('/status', authenticateToken, getDraftStatus);

module.exports = router;
