const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const {
  getAllPlayers,
  getPlayerById,
  updatePlayerProfile,
  uploadProfileImage,
  getSoleSurvivorHistory,
  updateSoleSurvivor,
  getSoleSurvivorBonus
} = require('../controllers/playerController');
const { getPlayerDraftPicksBreakdown } = require('../controllers/draftPickController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// All player routes require authentication
router.get('/', authenticateToken, getAllPlayers);
router.get('/:id', authenticateToken, getPlayerById);
router.put('/:id', authenticateToken, updatePlayerProfile);
router.post('/:id/profile-image', authenticateToken, upload.single('image'), uploadProfileImage);

// Sole survivor routes
router.get('/:playerId/sole-survivor-history', authenticateToken, getSoleSurvivorHistory);
router.get('/:playerId/sole-survivor-bonus', authenticateToken, getSoleSurvivorBonus);
router.post('/:playerId/sole-survivor', authenticateToken, updateSoleSurvivor);

// Draft picks routes
router.get('/:playerId/draft-picks-breakdown', authenticateToken, getPlayerDraftPicksBreakdown);

module.exports = router;
