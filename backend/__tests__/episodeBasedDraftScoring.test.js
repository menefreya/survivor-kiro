const ScoreCalculationService = require('../services/scoreCalculationService');
const supabase = require('../db/supabase');

describe('Episode-Based Draft Scoring', () => {
  describe('calculateContestantScoreForEpisodeRange', () => {
    it('should calculate score for full range (start episode 1, no end)', async () => {
      // Test Alex Moor (contestant_id: 1) from episode 1 onwards
      const score = await ScoreCalculationService.calculateContestantScoreForEpisodeRange(1, 1, null);
      expect(score).toBe(3); // Should get all of Alex's points
    });

    it('should calculate score for limited range (episodes 1-6)', async () => {
      // Test Jake Latimer (contestant_id: 2) from episode IDs 1-6 (episode numbers 1-3)
      const score = await ScoreCalculationService.calculateContestantScoreForEpisodeRange(2, 1, 6);
      expect(score).toBe(0); // Should get Jake's points from episodes 1-3 (which is 0)
    });

    it('should calculate score for future range (episode 10+)', async () => {
      // Test Jawan Pitts (contestant_id: 4) from episode ID 10 onwards (future episodes)
      const score = await ScoreCalculationService.calculateContestantScoreForEpisodeRange(4, 10, null);
      expect(score).toBe(0); // Should get 0 since Jawan has no scores in future episodes
    });

    it('should calculate score for past range (episodes 1-3)', async () => {
      // Test Jawan Pitts (contestant_id: 4) from episode IDs 1-6 (episode numbers 1-3)
      const score = await ScoreCalculationService.calculateContestantScoreForEpisodeRange(4, 1, 6);
      expect(score).toBe(7); // Should get 2+4+1 = 7 points from episodes 1-3
    });
  });

  describe('calculatePlayerScore with episode ranges', () => {
    it('should calculate player score using episode-based draft picks', async () => {
      // Test player 1's score with episode-based draft picks
      const playerScore = await ScoreCalculationService.calculatePlayerScore(1);
      
      // Expected breakdown:
      // - Jake Latimer (episodes 1-6): 0 points
      // - Alex Moor (episodes 1+): 3 points  
      // - Jawan Pitts (episodes 10+): 0 points
      // Total draft score: 3 points
      
      expect(playerScore.draft_score).toBe(3);
      expect(playerScore.total).toBeGreaterThanOrEqual(3);
    });
  });
});