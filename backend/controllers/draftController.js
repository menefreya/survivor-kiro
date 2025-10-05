const draftService = require('../services/draftService');

/**
 * Trigger the draft process
 * POST /api/draft
 * Admin only (enforced by requireAdmin middleware)
 */
async function triggerDraft(req, res) {
  try {
    // Execute draft (admin check handled by middleware)
    const draftPicks = await draftService.executeDraft();

    res.status(200).json({
      message: 'Draft completed successfully',
      pickCount: draftPicks.length,
      picks: draftPicks
    });
  } catch (error) {
    console.error('Draft error:', error);
    
    // Handle specific error cases
    if (error.message.includes('already been completed')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Not all players have submitted')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to execute draft', details: error.message });
  }
}

/**
 * Get draft status
 * GET /api/draft/status
 */
async function getDraftStatus(req, res) {
  try {
    const status = await draftService.checkDraftStatus();
    const rankingStatus = await draftService.getPlayerRankingStatus();
    
    res.status(200).json({
      isComplete: status.isComplete,
      pickCount: status.pickCount,
      completedAt: status.completedAt,
      players: rankingStatus.players,
      totalPlayers: rankingStatus.totalPlayers,
      submittedCount: rankingStatus.submittedCount
    });
  } catch (error) {
    console.error('Draft status error:', error);
    res.status(500).json({ error: 'Failed to check draft status', details: error.message });
  }
}

module.exports = {
  triggerDraft,
  getDraftStatus
};
