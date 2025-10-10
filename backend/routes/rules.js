const express = require('express');
const router = express.Router();
const { getScoringRules } = require('../controllers/rulesController');

// Get scoring rules (public)
router.get('/scoring', getScoringRules);

module.exports = router;