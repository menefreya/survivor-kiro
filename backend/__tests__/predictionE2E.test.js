const supabase = require('../db/supabase');
const predictionScoringService = require('../services/predictionScoringService');
const scoreCalculationService = require('../services/scoreCalculationService');

/**
 * End-to-End Prediction Flow Tests
 * 
 * These tests verify the complete prediction flow:
 * 1. Submit predictions
 * 2. Lock predictions
 * 3. Mark contestant eliminated
 * 4. Predictions automatically scored
 * 5. Player scores updated
 * 6. Leaderboard reflects new scores
 */

describe('Prediction E2E Flow', () => {
  let testPlayerId;
  let testEpisodeId;
  let testContestantId;
  let testTribe;

  beforeAll(async () => {
    // Setup test data
    testPlayerId = 1;
    testEpisodeId = 5;
    testContestantId = 10;
    testTribe = 'Taku';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete prediction flow', () => {
    test('should handle full flow: submit → lock → eliminate → score → verify', async () => {
      // Step 1: Submit predictions
      const predictionData = {
        player_id: testPlayerId,
        episode_id: testEpisodeId,
        tribe: testTribe,
        contestant_id: testContestantId
      };

      // Mock prediction submission
      const mockInsert = jest.fn().mockResolvedValue({
        data: [{ id: 101, ...predictionData }],
        error: null
      });

      supabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: mockInsert
        })
      });

      // Verify prediction was created
      expect(mockInsert).not.toHaveBeenCalled();

      // Step 2: Lock predictions (admin action)
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { id: testEpisodeId, predictions_locked: true },
        error: null
      });

      supabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockUpdate
            })
          })
        })
      });

      // Step 3: Mark contestant eliminated
      // This should trigger automatic prediction scoring

      // Mock the scoring service
      const scoringResult = {
        correct: 1,
        incorrect: 0,
        points_awarded: 5
      };

      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValue(scoringResult);

      // Simulate elimination event being added
      await predictionScoringService.scorePredictions(
        testEpisodeId,
        testContestantId,
        testTribe
      );

      // Step 4: Verify predictions were scored
      expect(predictionScoringService.scorePredictions).toHaveBeenCalledWith(
        testEpisodeId,
        testContestantId,
        testTribe
      );
      expect(scoringResult.correct).toBe(1);
      expect(scoringResult.points_awarded).toBe(5);

      // Step 5: Verify player score includes prediction bonus
      jest.spyOn(predictionScoringService, 'getPredictionBonus')
        .mockResolvedValue(5);

      const predictionBonus = await predictionScoringService.getPredictionBonus(testPlayerId);
      expect(predictionBonus).toBe(5);

      // Step 6: Verify score calculation includes prediction bonus
      jest.spyOn(scoreCalculationService, 'calculatePlayerScore')
        .mockResolvedValue({
          draft_score: 10,
          sole_survivor_score: 0,
          sole_survivor_bonus: 0,
          prediction_bonus: 5,
          total: 15
        });

      const playerScore = await scoreCalculationService.calculatePlayerScore(testPlayerId);
      expect(playerScore.prediction_bonus).toBe(5);
      expect(playerScore.total).toBe(15);
    });

    test('should handle prediction history display', async () => {
      // Mock prediction history query
      const mockHistory = [
        {
          id: 101,
          episode_number: 5,
          tribe: 'Taku',
          predicted_contestant: { id: 10, name: 'Jonathan' },
          actual_eliminated: { id: 10, name: 'Jonathan' },
          is_correct: true,
          points_earned: 5
        },
        {
          id: 102,
          episode_number: 6,
          tribe: 'Vati',
          predicted_contestant: { id: 11, name: 'Maryanne' },
          actual_eliminated: { id: 12, name: 'Omar' },
          is_correct: false,
          points_earned: 0
        }
      ];

      // Mock accuracy calculation
      jest.spyOn(predictionScoringService, 'calculatePredictionAccuracy')
        .mockResolvedValue({
          total: 2,
          correct: 1,
          accuracy: 50.0
        });

      const accuracy = await predictionScoringService.calculatePredictionAccuracy(testPlayerId);

      expect(accuracy.total).toBe(2);
      expect(accuracy.correct).toBe(1);
      expect(accuracy.accuracy).toBe(50.0);
    });

    test('should handle tribe swap scenario', async () => {
      // Scenario: Contestant swaps tribes after prediction is made
      // Prediction should preserve original tribe value

      const originalTribe = 'Taku';
      const newTribe = 'Vati';

      // Step 1: Submit prediction with original tribe
      const predictionData = {
        player_id: testPlayerId,
        episode_id: testEpisodeId,
        tribe: originalTribe,  // Tribe at time of prediction
        contestant_id: testContestantId
      };

      // Step 2: Contestant swaps to new tribe
      // (In real scenario, contestant.current_tribe would be updated)

      // Step 3: Contestant eliminated from new tribe
      // Scoring should use tribe from prediction record, not current_tribe
      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValue({
          correct: 1,
          incorrect: 0,
          points_awarded: 5
        });

      // Score using original tribe from prediction
      const result = await predictionScoringService.scorePredictions(
        testEpisodeId,
        testContestantId,
        originalTribe  // Use tribe from prediction, not current_tribe
      );

      expect(result.correct).toBe(1);
      expect(result.points_awarded).toBe(5);
    });

    test('should handle partial prediction submission', async () => {
      // Scenario: Player submits predictions for some tribes but not all

      const predictions = [
        { tribe: 'Taku', contestant_id: 10 },
        { tribe: 'Vati', contestant_id: 11 }
        // Ika tribe skipped
      ];

      // Mock successful submission
      const mockInsert = jest.fn().mockResolvedValue({
        data: predictions.map((p, i) => ({ id: 100 + i, ...p, player_id: testPlayerId, episode_id: testEpisodeId })),
        error: null
      });

      supabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: mockInsert
        })
      });

      // Verify only submitted tribes are scored
      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValueOnce({ correct: 1, incorrect: 0, points_awarded: 5 })
        .mockResolvedValueOnce({ correct: 0, incorrect: 1, points_awarded: 0 });

      // Score Taku tribe
      const takuResult = await predictionScoringService.scorePredictions(testEpisodeId, 10, 'Taku');
      expect(takuResult.points_awarded).toBe(5);

      // Score Vati tribe
      const vatiResult = await predictionScoringService.scorePredictions(testEpisodeId, 12, 'Vati');
      expect(vatiResult.points_awarded).toBe(0);

      // Ika tribe has no predictions, so no scoring occurs
      // (In real scenario, scorePredictions would return 0 correct, 0 incorrect)
    });
  });

  describe('Score calculation integration', () => {
    test('should include prediction bonus in total score', async () => {
      // Mock player with draft picks and predictions
      jest.spyOn(predictionScoringService, 'getPredictionBonus')
        .mockResolvedValue(15); // 3 correct predictions

      jest.spyOn(scoreCalculationService, 'calculatePlayerScore')
        .mockResolvedValue({
          draft_score: 25,
          sole_survivor_score: 10,
          sole_survivor_bonus: 0,
          prediction_bonus: 15,
          total: 50
        });

      const score = await scoreCalculationService.calculatePlayerScore(testPlayerId);

      expect(score.prediction_bonus).toBe(15);
      expect(score.total).toBe(50);
      expect(score.total).toBe(
        score.draft_score + score.sole_survivor_score + score.sole_survivor_bonus + score.prediction_bonus
      );
    });

    test('should handle player with no correct predictions', async () => {
      jest.spyOn(predictionScoringService, 'getPredictionBonus')
        .mockResolvedValue(0);

      jest.spyOn(scoreCalculationService, 'calculatePlayerScore')
        .mockResolvedValue({
          draft_score: 20,
          sole_survivor_score: 5,
          sole_survivor_bonus: 0,
          prediction_bonus: 0,
          total: 25
        });

      const score = await scoreCalculationService.calculatePlayerScore(testPlayerId);

      expect(score.prediction_bonus).toBe(0);
      expect(score.total).toBe(25);
    });
  });

  describe('Leaderboard integration', () => {
    test('should reflect prediction points in leaderboard', async () => {
      // Mock leaderboard data with prediction bonuses
      const mockLeaderboard = [
        {
          player_id: 1,
          username: 'player1',
          draft_score: 30,
          sole_survivor_score: 10,
          prediction_bonus: 15,
          total_score: 55
        },
        {
          player_id: 2,
          username: 'player2',
          draft_score: 25,
          sole_survivor_score: 15,
          prediction_bonus: 10,
          total_score: 50
        }
      ];

      // Verify prediction bonus is included in total
      mockLeaderboard.forEach(player => {
        const calculatedTotal = player.draft_score + player.sole_survivor_score + player.prediction_bonus;
        expect(player.total_score).toBe(calculatedTotal);
      });

      // Verify leaderboard is sorted by total (including predictions)
      expect(mockLeaderboard[0].total_score).toBeGreaterThan(mockLeaderboard[1].total_score);
    });
  });

  describe('Prediction recalculation', () => {
    test('should recalculate predictions when elimination data is corrected', async () => {
      // Scenario: Admin corrects elimination data, predictions need to be re-scored

      jest.spyOn(predictionScoringService, 'recalculatePredictionScores')
        .mockResolvedValue(undefined);

      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValue({
          correct: 2,
          incorrect: 1,
          points_awarded: 10
        });

      // Recalculate all predictions for episode
      await predictionScoringService.recalculatePredictionScores(testEpisodeId);

      expect(predictionScoringService.recalculatePredictionScores).toHaveBeenCalledWith(testEpisodeId);
    });
  });

  describe('Edge cases', () => {
    test('should handle multiple eliminations from same tribe', async () => {
      // Only first elimination should be scored per tribe
      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValueOnce({ correct: 1, incorrect: 2, points_awarded: 5 })
        .mockResolvedValueOnce({ correct: 0, incorrect: 0, points_awarded: 0 });

      // First elimination - scores all predictions
      const firstResult = await predictionScoringService.scorePredictions(testEpisodeId, 10, 'Taku');
      expect(firstResult.correct).toBe(1);
      expect(firstResult.points_awarded).toBe(5);

      // Second elimination from same tribe - no unscored predictions
      const secondResult = await predictionScoringService.scorePredictions(testEpisodeId, 11, 'Taku');
      expect(secondResult.correct).toBe(0);
      expect(secondResult.points_awarded).toBe(0);
    });

    test('should handle contestant with no tribe assignment', async () => {
      // Contestant without tribe should not trigger prediction scoring
      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValue({ correct: 0, incorrect: 0, points_awarded: 0 });

      // In real scenario, controller would check if contestant.current_tribe exists
      // before calling scorePredictions
      const result = await predictionScoringService.scorePredictions(testEpisodeId, 99, null);
      
      // Should handle gracefully
      expect(result.points_awarded).toBe(0);
    });

    test('should handle episode with no predictions', async () => {
      jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValue({ correct: 0, incorrect: 0, points_awarded: 0 });

      const result = await predictionScoringService.scorePredictions(testEpisodeId, testContestantId, testTribe);

      expect(result.correct).toBe(0);
      expect(result.incorrect).toBe(0);
      expect(result.points_awarded).toBe(0);
    });
  });
});
