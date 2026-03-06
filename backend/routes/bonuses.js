const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getAllBonuses, getPlayerBonuses, createBonus, deleteBonus } = require('../controllers/bonusController');

// All bonus routes require authentication
router.use(authenticateToken);

// Admin only: list all bonuses, create, delete
router.get('/', requireAdmin, getAllBonuses);
router.post('/', requireAdmin, createBonus);
router.delete('/:id', requireAdmin, deleteBonus);

// Any authenticated user can fetch their own bonuses (or admin can fetch any player's)
router.get('/player/:playerId', getPlayerBonuses);

module.exports = router;
