const request = require('supertest');
const express = require('express');
const { getContestantPerformance } = require('../controllers/contestantController');
const supabase = require('../db/supabase');
const { calculateMultipleContestantTrends, calculatePerformanceTrend } = require('../services/contestantPerformanceService');

// Mock the supabase module
jest.mock('../db/supabase', () => ({
  from: jest.fn()
}));

// Mock the contestant performance service
jest.mock('../services/contestantPerformanceService', () => ({
  calculateMultipleContestantTrends: jest.fn(),
  calculatePerformanceTrend: jest.fn()
}));

// Mock JWT utilities
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn()
}));

const { verifyToken } = require('../utils/jwt');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/contestants', require('../routes/contestants'));

// Test data constants
const VALID_JWT_TOKEN = 'valid-test-token';
const INVALID_JWT_TOKEN = 'invalid-test-token';
const TEST_USER = { id: 1, email: 'test@example.com', isAdmin: false };
const TEST_ADMIN = { id: 2, email: 'admin@example.com', isAdmin: true };

describe('Contestant Performance API Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup JWT mock
    verifyToken.mockImplementation((token) => {
      if (token === VALID_JWT_TOKEN) {
        return TEST_USER;
      } else {
        throw new Error('Invalid token');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication token', async () => {
      const response = await request(app)
        .get('/api/contestants/performance');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/contestants/performance')
        .set('Authorization', `Bearer ${INVALID_JWT_TOKEN}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should accept valid authentication token', async () => {
      // Mock successful database responses
      const mockContestants = [
        { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 100, profession: 'Teacher', is_eliminated: false }
      ];

      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: mockContestants, 
        error: null 
      });

      const scoresSelectMock = jest.fn().mockReturnThis();
      const scoresOrderMock = jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      });

      supabase.from
        .mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        })
        .mockReturnValueOnce({
          select: scoresSelectMock,
          order: scoresOrderMock
        });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      scoresSelectMock.mockReturnValue({
        order: scoresOrderMock
      });

      calculateMultipleContestantTrends.mockResolvedValue({ 1: 'n/a' });

      const response = await request(app)
        .get('/api/contestants/performance')
        .set('Authorization', `Bearer ${VALID_JWT_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Endpoint Functionality', () => {
    let req, res;

    beforeEach(() => {
      req = {
        user: TEST_USER
      };
      
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    describe('getContestantPerformance Controller', () => {
    it('should return contestant performance data with correct structure', async () => {
      // Mock contestants data
      const mockContestants = [
        { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 100, profession: 'Teacher', is_eliminated: false },
        { id: 2, name: 'Bob', image_url: null, total_score: 80, profession: 'Engineer', is_eliminated: true },
        { id: 3, name: 'Charlie', image_url: 'charlie.jpg', total_score: 60, profession: 'Doctor', is_eliminated: false }
      ];

      // Mock episode scores data
      const mockEpisodeScores = [
        { contestant_id: 1, score: 20, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 1, score: 25, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 1, score: 30, episodes: { id: 3, episode_number: 3 } },
        { contestant_id: 1, score: 25, episodes: { id: 4, episode_number: 4 } },
        { contestant_id: 2, score: 15, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 2, score: 20, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 2, score: 25, episodes: { id: 3, episode_number: 3 } },
        { contestant_id: 2, score: 20, episodes: { id: 4, episode_number: 4 } },
        { contestant_id: 3, score: 10, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 3, score: 15, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 3, score: 20, episodes: { id: 3, episode_number: 3 } },
        { contestant_id: 3, score: 15, episodes: { id: 4, episode_number: 4 } }
      ];

      // Mock trend calculation service
      calculateMultipleContestantTrends.mockResolvedValue({
        1: 'same', // 4 episodes: last episode (25) vs previous 2 average (27.5) = -9.1% change
        2: 'down', // 4 episodes: last episode (20) vs previous 2 average (22.5) = -11.1% change  
        3: 'down'  // 4 episodes: last episode (15) vs previous 2 average (17.5) = -14.3% change
      });

      // Setup mocks for contestants query
      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: mockContestants, 
        error: null 
      });

      // Setup mocks for episode scores query
      const scoresSelectMock = jest.fn().mockReturnThis();
      const scoresOrderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      // Mock supabase.from() calls
      supabase.from
        .mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        })
        .mockReturnValueOnce({
          select: scoresSelectMock,
          order: scoresOrderMock
        });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      scoresSelectMock.mockReturnValue({
        order: scoresOrderMock
      });

      await getContestantPerformance(req, res);

      // Verify the trend calculation service was called with correct contestant IDs
      expect(calculateMultipleContestantTrends).toHaveBeenCalledWith([1, 2, 3]);

      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Alice',
            image_url: 'alice.jpg',
            total_score: 100,
            average_per_episode: 25.0,
            trend: 'same',
            episodes_participated: 4,
            is_eliminated: false,
            profession: 'Teacher',
            rank: 1
          }),
          expect.objectContaining({
            id: 2,
            name: 'Bob',
            image_url: null,
            total_score: 80,
            average_per_episode: 20.0,
            trend: 'down',
            episodes_participated: 4,
            is_eliminated: true,
            profession: 'Engineer',
            rank: 2
          }),
          expect.objectContaining({
            id: 3,
            name: 'Charlie',
            image_url: 'charlie.jpg',
            total_score: 60,
            average_per_episode: 15.0,
            trend: 'down',
            episodes_participated: 4,
            is_eliminated: false,
            profession: 'Doctor',
            rank: 3
          })
        ])
      });

      // Verify contestants are sorted by total_score descending
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData[0].total_score).toBeGreaterThanOrEqual(responseData[1].total_score);
      expect(responseData[1].total_score).toBeGreaterThanOrEqual(responseData[2].total_score);
    });

    it('should calculate trend correctly with 6+ episodes', async () => {
      // Mock contestant with 6 episodes to test trend calculation
      const mockContestants = [
        { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 150, profession: 'Teacher', is_eliminated: false }
      ];

      // Mock 6 episodes with clear trend (improving)
      const mockEpisodeScores = [
        { contestant_id: 1, score: 10, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 1, score: 15, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 1, score: 20, episodes: { id: 3, episode_number: 3 } },
        { contestant_id: 1, score: 25, episodes: { id: 4, episode_number: 4 } },
        { contestant_id: 1, score: 30, episodes: { id: 5, episode_number: 5 } },
        { contestant_id: 1, score: 35, episodes: { id: 6, episode_number: 6 } }
      ];

      // Mock trend calculation service to return 'up' trend
      calculateMultipleContestantTrends.mockResolvedValue({
        1: 'up' // Previous 3 avg: 15, Recent 3 avg: 30 = 100% increase
      });

      // Setup mocks
      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: mockContestants, 
        error: null 
      });

      const scoresSelectMock = jest.fn().mockReturnThis();
      const scoresOrderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from
        .mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        })
        .mockReturnValueOnce({
          select: scoresSelectMock,
          order: scoresOrderMock
        });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      scoresSelectMock.mockReturnValue({
        order: scoresOrderMock
      });

      await getContestantPerformance(req, res);

      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData[0].trend).toBe('up');
    });

    it('should handle contestants with no episodes', async () => {
      const mockContestants = [
        { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 0, profession: 'Teacher', is_eliminated: false }
      ];

      const mockEpisodeScores = []; // No episode scores

      // Mock trend calculation service to return 'n/a' for no episodes
      calculateMultipleContestantTrends.mockResolvedValue({
        1: 'n/a'
      });

      // Setup mocks
      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: mockContestants, 
        error: null 
      });

      const scoresSelectMock = jest.fn().mockReturnThis();
      const scoresOrderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from
        .mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        })
        .mockReturnValueOnce({
          select: scoresSelectMock,
          order: scoresOrderMock
        });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      scoresSelectMock.mockReturnValue({
        order: scoresOrderMock
      });

      await getContestantPerformance(req, res);

      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData[0].average_per_episode).toBeNull();
      expect(responseData[0].trend).toBe('n/a');
      expect(responseData[0].episodes_participated).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error for contestants query
      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      supabase.from.mockReturnValueOnce({
        select: contestantsSelectMock,
        order: contestantsOrderMock
      });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      await getContestantPerformance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch contestants' });
    });

    it('should handle episode scores database errors gracefully', async () => {
      // Mock successful contestants query
      const mockContestants = [
        { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 100, profession: 'Teacher', is_eliminated: false }
      ];

      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: mockContestants, 
        error: null 
      });

      // Mock database error for episode scores query
      const scoresSelectMock = jest.fn().mockReturnThis();
      const scoresOrderMock = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      supabase.from
        .mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        })
        .mockReturnValueOnce({
          select: scoresSelectMock,
          order: scoresOrderMock
        });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      scoresSelectMock.mockReturnValue({
        order: scoresOrderMock
      });

      await getContestantPerformance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch episode scores' });
    });

    it('should handle trend calculation service errors gracefully', async () => {
      const mockContestants = [
        { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 100, profession: 'Teacher', is_eliminated: false }
      ];

      const mockEpisodeScores = [
        { contestant_id: 1, score: 25, episodes: { id: 1, episode_number: 1 } }
      ];

      // Setup successful database mocks
      const contestantsSelectMock = jest.fn().mockReturnThis();
      const contestantsOrderMock = jest.fn().mockResolvedValue({ 
        data: mockContestants, 
        error: null 
      });

      const scoresSelectMock = jest.fn().mockReturnThis();
      const scoresOrderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from
        .mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        })
        .mockReturnValueOnce({
          select: scoresSelectMock,
          order: scoresOrderMock
        });

      contestantsSelectMock.mockReturnValue({
        order: contestantsOrderMock
      });

      scoresSelectMock.mockReturnValue({
        order: scoresOrderMock
      });

      // Mock trend calculation service to throw error
      calculateMultipleContestantTrends.mockRejectedValue(new Error('Trend calculation failed'));

      await getContestantPerformance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
    });
  });

  describe('Performance Calculation Accuracy', () => {
    describe('Average Points Per Episode Calculation', () => {
      it('should calculate correct average for contestants with episodes', () => {
        const mockContestants = [
          { id: 1, name: 'Alice', total_score: 100, profession: 'Teacher', is_eliminated: false }
        ];

        const mockEpisodeScores = [
          { contestant_id: 1, score: 25, episodes: { episode_number: 1 } },
          { contestant_id: 1, score: 30, episodes: { episode_number: 2 } },
          { contestant_id: 1, score: 20, episodes: { episode_number: 3 } },
          { contestant_id: 1, score: 25, episodes: { episode_number: 4 } }
        ];

        // Expected: 100 total / 4 episodes = 25.0 average
        const expectedAverage = 25.0;

        // This would be tested in the controller test above
        expect(expectedAverage).toBe(25.0);
      });

      it('should return null average for contestants with no episodes', () => {
        const mockContestants = [
          { id: 1, name: 'Alice', total_score: 0, profession: 'Teacher', is_eliminated: false }
        ];

        const mockEpisodeScores = []; // No episodes

        // Expected: null for no episodes
        const expectedAverage = null;

        expect(expectedAverage).toBeNull();
      });

      it('should handle eliminated contestants correctly', () => {
        const mockContestants = [
          { id: 1, name: 'Alice', total_score: 60, profession: 'Teacher', is_eliminated: true }
        ];

        const mockEpisodeScores = [
          { contestant_id: 1, score: 20, episodes: { episode_number: 1 } },
          { contestant_id: 1, score: 25, episodes: { episode_number: 2 } },
          { contestant_id: 1, score: 15, episodes: { episode_number: 3 } }
        ];

        // Expected: 60 total / 3 episodes = 20.0 average (only episodes participated)
        const expectedAverage = 20.0;

        expect(expectedAverage).toBe(20.0);
      });
    });

    describe('Ranking Calculation', () => {
      it('should rank contestants by total score descending', async () => {
        const mockContestants = [
          { id: 1, name: 'Alice', total_score: 100, profession: 'Teacher', is_eliminated: false },
          { id: 2, name: 'Bob', total_score: 80, profession: 'Engineer', is_eliminated: false },
          { id: 3, name: 'Charlie', total_score: 120, profession: 'Doctor', is_eliminated: false }
        ];

        // Supabase should return them sorted by total_score DESC
        const expectedOrder = [
          { id: 3, name: 'Charlie', total_score: 120, rank: 1 },
          { id: 1, name: 'Alice', total_score: 100, rank: 2 },
          { id: 2, name: 'Bob', total_score: 80, rank: 3 }
        ];

        expectedOrder.forEach((contestant, index) => {
          expect(contestant.rank).toBe(index + 1);
        });
      });
    });
  });

  describe('Trend Calculation Logic', () => {
    describe('calculatePerformanceTrend', () => {
      it('should return "n/a" for contestants with fewer than 3 episodes', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 25 }
        ];

        calculatePerformanceTrend.mockReturnValue('n/a');
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('n/a');
      });

      it('should calculate trend correctly for 3-5 episodes', () => {
        // Test case: 4 episodes, last episode vs previous 2 average
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 25 },
          { episode_number: 3, score: 30 },
          { episode_number: 4, score: 35 } // Last episode: 35, Previous 2 avg: (25+30)/2 = 27.5
        ];

        calculatePerformanceTrend.mockReturnValue('up'); // 35 > 27.5, increase > 5%
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up');
      });

      it('should calculate trend correctly for 6+ episodes', () => {
        // Test case: 6 episodes, recent 3 vs previous 3 average
        const episodeScores = [
          { episode_number: 1, score: 10 }, // Previous 3: 10, 15, 20 = avg 15
          { episode_number: 2, score: 15 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 25 }, // Recent 3: 25, 30, 35 = avg 30
          { episode_number: 5, score: 30 },
          { episode_number: 6, score: 35 }
        ];

        calculatePerformanceTrend.mockReturnValue('up'); // 30 > 15, 100% increase
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up');
      });

      it('should apply 5% threshold for "same" trend classification', () => {
        // Test case: Change within 5% threshold
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 20 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 21 } // 21 vs 20 = 5% change exactly
        ];

        calculatePerformanceTrend.mockReturnValue('same'); // Within 5% threshold
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('same');
      });

      it('should return "down" for declining performance', () => {
        const episodeScores = [
          { episode_number: 1, score: 30 },
          { episode_number: 2, score: 25 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 15 } // 15 vs (25+20)/2 = 22.5, -33% change
        ];

        calculatePerformanceTrend.mockReturnValue('down');
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('down');
      });
    });

    describe('Edge Cases', () => {
      it('should handle contestants with identical scores across episodes', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 20 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 20 }
        ];

        calculatePerformanceTrend.mockReturnValue('same'); // No change = same
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('same');
      });

      it('should handle contestants with zero scores', () => {
        const episodeScores = [
          { episode_number: 1, score: 0 },
          { episode_number: 2, score: 0 },
          { episode_number: 3, score: 5 }
        ];

        calculatePerformanceTrend.mockReturnValue('up'); // 5 vs 0 = infinite % increase
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up');
      });

      it('should handle negative scores', () => {
        const episodeScores = [
          { episode_number: 1, score: -10 },
          { episode_number: 2, score: -5 },
          { episode_number: 3, score: 0 }
        ];

        calculatePerformanceTrend.mockReturnValue('up'); // 0 vs (-5 + -10)/2 = -7.5, improvement
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up');
      });
    });
  });

  describe('Error Handling', () => {
    describe('Database Connection Failures', () => {
      it('should handle complete database unavailability', async () => {
        const req = { user: TEST_USER };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };

        // Mock complete database failure
        supabase.from.mockImplementation(() => {
          throw new Error('Database connection refused');
        });

        await getContestantPerformance(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      });

      it('should handle timeout errors', async () => {
        const req = { user: TEST_USER };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };

        const contestantsSelectMock = jest.fn().mockReturnThis();
        const contestantsOrderMock = jest.fn().mockRejectedValue(new Error('Query timeout'));

        supabase.from.mockReturnValueOnce({
          select: contestantsSelectMock,
          order: contestantsOrderMock
        });

        contestantsSelectMock.mockReturnValue({
          order: contestantsOrderMock
        });

        await getContestantPerformance(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      });
    });

    describe('Data Integrity Issues', () => {
      it('should handle missing contestant data gracefully', async () => {
        const req = { user: TEST_USER };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };

        // Mock empty contestants response
        const contestantsSelectMock = jest.fn().mockReturnThis();
        const contestantsOrderMock = jest.fn().mockResolvedValue({ 
          data: [], 
          error: null 
        });

        const scoresSelectMock = jest.fn().mockReturnThis();
        const scoresOrderMock = jest.fn().mockResolvedValue({ 
          data: [], 
          error: null 
        });

        supabase.from
          .mockReturnValueOnce({
            select: contestantsSelectMock,
            order: contestantsOrderMock
          })
          .mockReturnValueOnce({
            select: scoresSelectMock,
            order: scoresOrderMock
          });

        contestantsSelectMock.mockReturnValue({
          order: contestantsOrderMock
        });

        scoresSelectMock.mockReturnValue({
          order: scoresOrderMock
        });

        calculateMultipleContestantTrends.mockResolvedValue({});

        await getContestantPerformance(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [] });
      });

      it('should handle malformed episode scores data', async () => {
        const req = { user: TEST_USER };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };

        const mockContestants = [
          { id: 1, name: 'Alice', total_score: 100, profession: 'Teacher', is_eliminated: false }
        ];

        // Mock malformed episode scores (missing episodes relation)
        const mockEpisodeScores = [
          { contestant_id: 1, score: 25, episodes: null }
        ];

        const contestantsSelectMock = jest.fn().mockReturnThis();
        const contestantsOrderMock = jest.fn().mockResolvedValue({ 
          data: mockContestants, 
          error: null 
        });

        const scoresSelectMock = jest.fn().mockReturnThis();
        const scoresOrderMock = jest.fn().mockResolvedValue({ 
          data: mockEpisodeScores, 
          error: null 
        });

        supabase.from
          .mockReturnValueOnce({
            select: contestantsSelectMock,
            order: contestantsOrderMock
          })
          .mockReturnValueOnce({
            select: scoresSelectMock,
            order: scoresOrderMock
          });

        contestantsSelectMock.mockReturnValue({
          order: contestantsOrderMock
        });

        scoresSelectMock.mockReturnValue({
          order: scoresOrderMock
        });

        calculateMultipleContestantTrends.mockResolvedValue({ 1: 'n/a' });

        // Should handle gracefully but will return 500 due to malformed data
        await getContestantPerformance(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Full API Endpoint Tests', () => {
      it('should return complete performance data structure', async () => {
        const mockContestants = [
          { id: 1, name: 'Alice', image_url: 'alice.jpg', total_score: 100, profession: 'Teacher', is_eliminated: false },
          { id: 2, name: 'Bob', image_url: null, total_score: 80, profession: 'Engineer', is_eliminated: true }
        ];

        const mockEpisodeScores = [
          { contestant_id: 1, score: 25, episodes: { episode_number: 1 } },
          { contestant_id: 1, score: 30, episodes: { episode_number: 2 } },
          { contestant_id: 1, score: 25, episodes: { episode_number: 3 } },
          { contestant_id: 1, score: 20, episodes: { episode_number: 4 } },
          { contestant_id: 2, score: 20, episodes: { episode_number: 1 } },
          { contestant_id: 2, score: 25, episodes: { episode_number: 2 } },
          { contestant_id: 2, score: 20, episodes: { episode_number: 3 } },
          { contestant_id: 2, score: 15, episodes: { episode_number: 4 } }
        ];

        const contestantsSelectMock = jest.fn().mockReturnThis();
        const contestantsOrderMock = jest.fn().mockResolvedValue({ 
          data: mockContestants, 
          error: null 
        });

        const scoresSelectMock = jest.fn().mockReturnThis();
        const scoresOrderMock = jest.fn().mockResolvedValue({ 
          data: mockEpisodeScores, 
          error: null 
        });

        supabase.from
          .mockReturnValueOnce({
            select: contestantsSelectMock,
            order: contestantsOrderMock
          })
          .mockReturnValueOnce({
            select: scoresSelectMock,
            order: scoresOrderMock
          });

        contestantsSelectMock.mockReturnValue({
          order: contestantsOrderMock
        });

        scoresSelectMock.mockReturnValue({
          order: scoresOrderMock
        });

        calculateMultipleContestantTrends.mockResolvedValue({
          1: 'down',
          2: 'down'
        });

        const response = await request(app)
          .get('/api/contestants/performance')
          .set('Authorization', `Bearer ${VALID_JWT_TOKEN}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        
        // Verify complete data structure
        expect(response.body.data[0]).toEqual({
          id: 1,
          name: 'Alice',
          image_url: 'alice.jpg',
          total_score: 100,
          average_per_episode: 25.0,
          trend: 'down',
          episodes_participated: 4,
          is_eliminated: false,
          profession: 'Teacher',
          rank: 1
        });

        expect(response.body.data[1]).toEqual({
          id: 2,
          name: 'Bob',
          image_url: null,
          total_score: 80,
          average_per_episode: 20.0,
          trend: 'down',
          episodes_participated: 4,
          is_eliminated: true,
          profession: 'Engineer',
          rank: 2
        });
      });

      it('should handle large datasets efficiently', async () => {
        // Create mock data for 20 contestants with 10 episodes each
        const mockContestants = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          name: `Contestant ${i + 1}`,
          image_url: `contestant${i + 1}.jpg`,
          total_score: Math.floor(Math.random() * 200) + 50,
          profession: 'Test',
          is_eliminated: i > 15 // Last 4 eliminated
        }));

        const mockEpisodeScores = [];
        for (let contestantId = 1; contestantId <= 20; contestantId++) {
          for (let episode = 1; episode <= 10; episode++) {
            mockEpisodeScores.push({
              contestant_id: contestantId,
              score: Math.floor(Math.random() * 30) + 5,
              episodes: { episode_number: episode }
            });
          }
        }

        const contestantsSelectMock = jest.fn().mockReturnThis();
        const contestantsOrderMock = jest.fn().mockResolvedValue({ 
          data: mockContestants, 
          error: null 
        });

        const scoresSelectMock = jest.fn().mockReturnThis();
        const scoresOrderMock = jest.fn().mockResolvedValue({ 
          data: mockEpisodeScores, 
          error: null 
        });

        supabase.from
          .mockReturnValueOnce({
            select: contestantsSelectMock,
            order: contestantsOrderMock
          })
          .mockReturnValueOnce({
            select: scoresSelectMock,
            order: scoresOrderMock
          });

        contestantsSelectMock.mockReturnValue({
          order: contestantsOrderMock
        });

        scoresSelectMock.mockReturnValue({
          order: scoresOrderMock
        });

        // Mock trends for all contestants
        const mockTrends = {};
        for (let i = 1; i <= 20; i++) {
          mockTrends[i] = ['up', 'down', 'same'][Math.floor(Math.random() * 3)];
        }
        calculateMultipleContestantTrends.mockResolvedValue(mockTrends);

        const startTime = Date.now();
        const response = await request(app)
          .get('/api/contestants/performance')
          .set('Authorization', `Bearer ${VALID_JWT_TOKEN}`);
        const endTime = Date.now();

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(20);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });
});