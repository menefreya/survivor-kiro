const predictionScoringService = require('../services/predictionScoringService');
const supabase = require('../db/supabase');

// Mock the supabase client
jest.mock('../db/supabase', () => ({
  from: jest.fn()
}));

describe('PredictionScoringService', () => {
  let mockFrom;
  let mockSelect;
  let mockUpdate;
  let mockEq;
  let mockNeq;
  let mockIs;
  let mockNot;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock chain
    mockNot = jest.fn().mockReturnThis();
    mockIs = jest.fn().mockReturnThis();
    mockNeq = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockReturnThis();
    mockSelect = jest.fn().mockReturnThis();
    mockFrom = jest.fn().mockReturnThis();

    // Configure the mock chain
    mockEq.mockReturnValue({
      eq: mockEq,
      neq: mockNeq,
      is: mockIs,
      not: mockNot
    });

    mockNeq.mockReturnValue({
      eq: mockEq,
      neq: mockNeq,
      is: mockIs
    });

    mockIs.mockReturnValue({
      eq: mockEq,
      is: mockIs
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      not: mockNot
    });

    mockUpdate.mockReturnValue({
      eq: mockEq
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    });

    supabase.from = mockFrom;
  });

  describe('scorePredictions', () => {
    test('should award 5 points for each correct prediction', async () => {
      // Mock predictions fetch
      mockIs.mockResolvedValueOnce({
        data: [
          { id: 1, player_id: 1, contestant_id: 10 }, // Correct
          { id: 2, player_id: 2, contestant_id: 11 }, // Incorrect
          { id: 3, player_id: 3, contestant_id: 10 }  // Correct
        ],
        error: null
      });

      // Mock correct predictions update
      mockIs.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock incorrect predictions update
      mockIs.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await predictionScoringService.scorePredictions(5, 10, 'Taku');

      expect(result).toEqual({
        correct: 2,
        incorrect: 1,
        points_awarded: 10 // 2 correct * 5 points
      });

      expect(mockFrom).toHaveBeenCalledWith('elimination_predictions');
    });

    test('should mark all predictions as incorrect when none match', async () => {
      // Mock predictions fetch
      mockIs.mockResolvedValueOnce({
        data: [
          { id: 1, player_id: 1, contestant_id: 11 },
          { id: 2, player_id: 2, contestant_id: 12 },
          { id: 3, player_id: 3, contestant_id: 13 }
        ],
        error: null
      });

      // Mock correct predictions update (none)
      mockIs.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock incorrect predictions update
      mockIs.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await predictionScoringService.scorePredictions(5, 10, 'Taku');

      expect(result).toEqual({
        correct: 0,
        incorrect: 3,
        points_awarded: 0
      });
    });

    test('should handle multiple eliminations in same tribe by only scoring unscored predictions', async () => {
      // First elimination - all predictions unscored
      mockIs.mockResolvedValueOnce({
        data: [
          { id: 1, player_id: 1, contestant_id: 10 },
          { id: 2, player_id: 2, contestant_id: 11 }
        ],
        error: null
      });

      mockIs.mockResolvedValueOnce({ data: null, error: null });
      mockIs.mockResolvedValueOnce({ data: null, error: null });

      const firstResult = await predictionScoringService.scorePredictions(5, 10, 'Taku');

      expect(firstResult).toEqual({
        correct: 1,
        incorrect: 1,
        points_awarded: 5
      });

      // Second elimination - no unscored predictions (is_correct is not null)
      mockIs.mockResolvedValueOnce({
        data: [], // No unscored predictions
        error: null
      });

      const secondResult = await predictionScoringService.scorePredictions(5, 11, 'Taku');

      expect(secondResult).toEqual({
        correct: 0,
        incorrect: 0,
        points_awarded: 0
      });
    });

    test('should return zeros when no predictions exist', async () => {
      mockIs.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await predictionScoringService.scorePredictions(5, 10, 'Taku');

      expect(result).toEqual({
        correct: 0,
        incorrect: 0,
        points_awarded: 0
      });
    });

    test('should throw error when database fetch fails', async () => {
      mockIs.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(
        predictionScoringService.scorePredictions(5, 10, 'Taku')
      ).rejects.toThrow('Failed to fetch predictions');
    });

    test('should throw error when update fails', async () => {
      mockIs.mockResolvedValueOnce({
        data: [{ id: 1, player_id: 1, contestant_id: 10 }],
        error: null
      });

      mockIs.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      });

      await expect(
        predictionScoringService.scorePredictions(5, 10, 'Taku')
      ).rejects.toThrow('Failed to update correct predictions');
    });
  });

  describe('getPredictionBonus', () => {
    test('should calculate total bonus as 5 points per correct prediction', async () => {
      // Setup mock chain for select().eq().eq()
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 1 },
            { id: 2 },
            { id: 3 }
          ],
          error: null
        })
      };
      
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqChain)
      });

      const bonus = await predictionScoringService.getPredictionBonus(1);

      expect(bonus).toBe(15); // 3 correct * 5 points
      expect(mockFrom).toHaveBeenCalledWith('elimination_predictions');
    });

    test('should return 0 when player has no correct predictions', async () => {
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
      
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqChain)
      });

      const bonus = await predictionScoringService.getPredictionBonus(1);

      expect(bonus).toBe(0);
    });

    test('should return 0 when player has null data', async () => {
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqChain)
      });

      const bonus = await predictionScoringService.getPredictionBonus(1);

      expect(bonus).toBe(0);
    });

    test('should gracefully handle database errors by returning 0', async () => {
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Table does not exist' }
        })
      };
      
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqChain)
      });

      const bonus = await predictionScoringService.getPredictionBonus(1);

      expect(bonus).toBe(0);
    });

    test('should handle large number of correct predictions', async () => {
      const predictions = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
      
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          data: predictions,
          error: null
        })
      };
      
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqChain)
      });

      const bonus = await predictionScoringService.getPredictionBonus(1);

      expect(bonus).toBe(50); // 10 correct * 5 points
    });
  });

  describe('calculatePredictionAccuracy', () => {
    test('should calculate accuracy percentage correctly', async () => {
      mockNot.mockResolvedValueOnce({
        data: [
          { is_correct: true },
          { is_correct: true },
          { is_correct: false },
          { is_correct: true },
          { is_correct: false }
        ],
        error: null
      });

      const accuracy = await predictionScoringService.calculatePredictionAccuracy(1);

      expect(accuracy).toEqual({
        total: 5,
        correct: 3,
        accuracy: 60.0 // 3/5 = 60%
      });
    });

    test('should return zeros when player has no scored predictions', async () => {
      mockNot.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const accuracy = await predictionScoringService.calculatePredictionAccuracy(1);

      expect(accuracy).toEqual({
        total: 0,
        correct: 0,
        accuracy: 0
      });
    });

    test('should handle 100% accuracy', async () => {
      mockNot.mockResolvedValueOnce({
        data: [
          { is_correct: true },
          { is_correct: true },
          { is_correct: true }
        ],
        error: null
      });

      const accuracy = await predictionScoringService.calculatePredictionAccuracy(1);

      expect(accuracy).toEqual({
        total: 3,
        correct: 3,
        accuracy: 100.0
      });
    });

    test('should handle 0% accuracy', async () => {
      mockNot.mockResolvedValueOnce({
        data: [
          { is_correct: false },
          { is_correct: false }
        ],
        error: null
      });

      const accuracy = await predictionScoringService.calculatePredictionAccuracy(1);

      expect(accuracy).toEqual({
        total: 2,
        correct: 0,
        accuracy: 0
      });
    });

    test('should round accuracy to 1 decimal place', async () => {
      mockNot.mockResolvedValueOnce({
        data: [
          { is_correct: true },
          { is_correct: false },
          { is_correct: false }
        ],
        error: null
      });

      const accuracy = await predictionScoringService.calculatePredictionAccuracy(1);

      expect(accuracy).toEqual({
        total: 3,
        correct: 1,
        accuracy: 33.3 // 1/3 = 33.333... rounded to 33.3
      });
    });

    test('should throw error when database fetch fails', async () => {
      mockNot.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(
        predictionScoringService.calculatePredictionAccuracy(1)
      ).rejects.toThrow('Failed to fetch scored predictions');
    });
  });

  describe('recalculatePredictionScores', () => {
    test('should reset and re-score all predictions for an episode', async () => {
      // Mock reset update
      mockEq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock fetch eliminations
      mockNot.mockResolvedValueOnce({
        data: [
          {
            contestant_id: 10,
            contestants: { current_tribe: 'Taku' }
          },
          {
            contestant_id: 11,
            contestants: { current_tribe: 'Vati' }
          }
        ],
        error: null
      });

      // Mock scorePredictions calls
      const scorePredictionsSpy = jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValueOnce({ correct: 2, incorrect: 1, points_awarded: 10 })
        .mockResolvedValueOnce({ correct: 1, incorrect: 2, points_awarded: 5 });

      await predictionScoringService.recalculatePredictionScores(5);

      expect(scorePredictionsSpy).toHaveBeenCalledTimes(2);
      expect(scorePredictionsSpy).toHaveBeenCalledWith(5, 10, 'Taku');
      expect(scorePredictionsSpy).toHaveBeenCalledWith(5, 11, 'Vati');

      scorePredictionsSpy.mockRestore();
    });

    test('should handle multiple eliminations from same tribe by scoring only first', async () => {
      // Mock reset update
      mockEq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock fetch eliminations - two from same tribe
      mockNot.mockResolvedValueOnce({
        data: [
          {
            contestant_id: 10,
            contestants: { current_tribe: 'Taku' }
          },
          {
            contestant_id: 12,
            contestants: { current_tribe: 'Taku' }
          }
        ],
        error: null
      });

      const scorePredictionsSpy = jest.spyOn(predictionScoringService, 'scorePredictions')
        .mockResolvedValue({ correct: 1, incorrect: 1, points_awarded: 5 });

      await predictionScoringService.recalculatePredictionScores(5);

      // Should only score once for Taku tribe
      expect(scorePredictionsSpy).toHaveBeenCalledTimes(1);
      expect(scorePredictionsSpy).toHaveBeenCalledWith(5, 10, 'Taku');

      scorePredictionsSpy.mockRestore();
    });

    test('should handle no eliminations gracefully', async () => {
      // Mock reset update
      mockEq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock fetch eliminations - empty
      mockNot.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const scorePredictionsSpy = jest.spyOn(predictionScoringService, 'scorePredictions');

      await predictionScoringService.recalculatePredictionScores(5);

      expect(scorePredictionsSpy).not.toHaveBeenCalled();

      scorePredictionsSpy.mockRestore();
    });

    test('should throw error when reset fails', async () => {
      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Reset failed' }
      });

      await expect(
        predictionScoringService.recalculatePredictionScores(5)
      ).rejects.toThrow('Failed to reset predictions');
    });

    test('should throw error when fetching eliminations fails', async () => {
      // Mock reset update
      mockEq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock fetch eliminations - error
      mockNot.mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed' }
      });

      await expect(
        predictionScoringService.recalculatePredictionScores(5)
      ).rejects.toThrow('Failed to fetch eliminations');
    });
  });
});
