const { 
  calculatePerformanceTrend, 
  calculateMultipleContestantTrends,
  getContestantEpisodeScores 
} = require('../services/contestantPerformanceService');
const supabase = require('../db/supabase');

// Mock the supabase module
jest.mock('../db/supabase', () => ({
  from: jest.fn()
}));

describe('Contestant Performance Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePerformanceTrend', () => {
    describe('Episode Count Requirements', () => {
      it('should return "n/a" for contestants with 0 episodes', () => {
        const episodeScores = [];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('n/a');
      });

      it('should return "n/a" for contestants with 1 episode', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('n/a');
      });

      it('should return "n/a" for contestants with 2 episodes', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 25 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('n/a');
      });
    });

    describe('3-5 Episodes Logic', () => {
      it('should calculate "up" trend for 3 episodes (last > previous 2 avg)', () => {
        const episodeScores = [
          { episode_number: 1, score: 10 },
          { episode_number: 2, score: 15 },
          { episode_number: 3, score: 25 } // 25 vs (10+15)/2 = 12.5, +100% change
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up');
      });

      it('should calculate "down" trend for 4 episodes (last < previous 2 avg)', () => {
        const episodeScores = [
          { episode_number: 1, score: 30 },
          { episode_number: 2, score: 25 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 10 } // 10 vs (25+20)/2 = 22.5, -55.6% change
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('down');
      });

      it('should calculate "up" trend for 5 episodes (above 5% threshold)', () => {
        const episodeScores = [
          { episode_number: 1, score: 15 },
          { episode_number: 2, score: 18 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 15 },
          { episode_number: 5, score: 25 } // 25 vs (20+15)/2 = 17.5, +42.9% change
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        // For 5 episodes, it compares last episode (25) vs previous 2 episodes average (20+15)/2 = 17.5
        // 25 vs 17.5 = +42.9% change, which is > 5%, so should be 'up'
        expect(result).toBe('up');
      });

      it('should calculate "same" trend for 5 episodes (within 5% threshold)', () => {
        const episodeScores = [
          { episode_number: 1, score: 15 },
          { episode_number: 2, score: 18 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 20 },
          { episode_number: 5, score: 20.5 } // 20.5 vs (20+20)/2 = 20, +2.5% change
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        // For 5 episodes, it compares last episode (20.5) vs previous 2 episodes average (20+20)/2 = 20
        // 20.5 vs 20 = +2.5% change, which is < 5%, so should be 'same'
        expect(result).toBe('same');
      });

      it('should calculate "same" trend when exactly at 5% threshold', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 20 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 21 } // 21 vs (20+20)/2 = 20, +5% change exactly
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('same'); // Exactly 5% should be 'same'
      });

      it('should handle exact 5% threshold correctly', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 20 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 19 } // 19 vs (20+20)/2 = 20, -5% change exactly
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('same'); // Exactly -5% should be 'same'
      });
    });

    describe('6+ Episodes Logic', () => {
      it('should calculate "up" trend for 6 episodes (recent 3 > previous 3)', () => {
        const episodeScores = [
          { episode_number: 1, score: 10 }, // Previous 3: 10, 15, 20 = avg 15
          { episode_number: 2, score: 15 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 25 }, // Recent 3: 25, 30, 35 = avg 30
          { episode_number: 5, score: 30 },
          { episode_number: 6, score: 35 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up'); // 30 vs 15 = +100% change
      });

      it('should calculate "down" trend for 7 episodes (recent 3 < previous 3)', () => {
        const episodeScores = [
          { episode_number: 1, score: 40 },
          { episode_number: 2, score: 35 }, // Previous 3: 35, 30, 25 = avg 30
          { episode_number: 3, score: 30 },
          { episode_number: 4, score: 25 },
          { episode_number: 5, score: 20 }, // Recent 3: 25, 20, 15 = avg 20
          { episode_number: 6, score: 15 },
          { episode_number: 7, score: 10 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('down'); // 20 vs 30 = -33.3% change
      });

      it('should calculate "same" trend for 8 episodes (within 5% threshold)', () => {
        const episodeScores = [
          { episode_number: 1, score: 18 },
          { episode_number: 2, score: 19 }, // Previous 3: 19, 20, 21 = avg 20
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 21 },
          { episode_number: 5, score: 22 },
          { episode_number: 6, score: 20 }, // Recent 3: 22, 20, 21 = avg 21
          { episode_number: 7, score: 21 },
          { episode_number: 8, score: 19 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('same'); // 21 vs 20 = +5% change, within threshold
      });

      it('should only consider last 6 episodes for trend calculation', () => {
        const episodeScores = [
          { episode_number: 1, score: 100 }, // These early episodes should be ignored
          { episode_number: 2, score: 100 },
          { episode_number: 3, score: 100 },
          { episode_number: 4, score: 10 }, // Previous 3: 10, 15, 20 = avg 15
          { episode_number: 5, score: 15 },
          { episode_number: 6, score: 20 },
          { episode_number: 7, score: 25 }, // Recent 3: 25, 30, 35 = avg 30
          { episode_number: 8, score: 30 },
          { episode_number: 9, score: 35 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up'); // Should ignore episodes 1-3 with score 100
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero scores correctly', () => {
        const episodeScores = [
          { episode_number: 1, score: 0 },
          { episode_number: 2, score: 0 },
          { episode_number: 3, score: 5 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up'); // 5 vs 0 = infinite improvement
      });

      it('should handle negative scores correctly', () => {
        const episodeScores = [
          { episode_number: 1, score: -10 },
          { episode_number: 2, score: -5 },
          { episode_number: 3, score: 0 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up'); // 0 vs (-10 + -5)/2 = -7.5, improvement
      });

      it('should handle identical scores across all episodes', () => {
        const episodeScores = [
          { episode_number: 1, score: 20 },
          { episode_number: 2, score: 20 },
          { episode_number: 3, score: 20 },
          { episode_number: 4, score: 20 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('same'); // No change = same
      });

      it('should handle decimal scores correctly', () => {
        const episodeScores = [
          { episode_number: 1, score: 10.5 },
          { episode_number: 2, score: 15.7 },
          { episode_number: 3, score: 20.3 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe('up'); // 20.3 vs (10.5 + 15.7)/2 = 13.1, +55% change
      });

      it('should handle very small score differences within threshold', () => {
        const episodeScores = [
          { episode_number: 1, score: 20.00 },
          { episode_number: 2, score: 20.50 },
          { episode_number: 3, score: 20.75 }
        ];
        const result = calculatePerformanceTrend(1, episodeScores);
        // 20.75 vs (20.00 + 20.50)/2 = 20.25, +2.47% change (within 5% threshold)
        expect(result).toBe('same');
      });
    });
  });

  describe('getContestantEpisodeScores', () => {
    it('should fetch and format episode scores correctly', async () => {
      const mockEpisodeScores = [
        { score: 25, episodes: { id: 1, episode_number: 1 } },
        { score: 30, episodes: { id: 2, episode_number: 2 } },
        { score: 20, episodes: { id: 3, episode_number: 3 } }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        eq: eqMock,
        order: orderMock
      });

      eqMock.mockReturnValue({
        order: orderMock
      });

      const result = await getContestantEpisodeScores(1);

      expect(result).toEqual([
        { episode_number: 1, score: 25 },
        { episode_number: 2, score: 30 },
        { episode_number: 3, score: 20 }
      ]);

      expect(supabase.from).toHaveBeenCalledWith('episode_scores');
      expect(selectMock).toHaveBeenCalledWith(`
        score,
        episodes!inner(
          id,
          episode_number
        )
      `);
      expect(eqMock).toHaveBeenCalledWith('contestant_id', 1);
      expect(orderMock).toHaveBeenCalledWith('episodes(episode_number)', { ascending: true });
    });

    it('should handle database errors gracefully', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        eq: eqMock,
        order: orderMock
      });

      eqMock.mockReturnValue({
        order: orderMock
      });

      try {
        await getContestantEpisodeScores(1);
        fail('Expected function to throw');
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });

    it('should handle empty results correctly', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        eq: eqMock,
        order: orderMock
      });

      eqMock.mockReturnValue({
        order: orderMock
      });

      const result = await getContestantEpisodeScores(1);
      expect(result).toEqual([]);
    });
  });

  describe('calculateMultipleContestantTrends', () => {
    it('should calculate trends for multiple contestants efficiently', async () => {
      const contestantIds = [1, 2, 3];
      const mockEpisodeScores = [
        // Contestant 1: 4 episodes, improving trend
        { contestant_id: 1, score: 10, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 1, score: 15, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 1, score: 20, episodes: { id: 3, episode_number: 3 } },
        { contestant_id: 1, score: 30, episodes: { id: 4, episode_number: 4 } },
        
        // Contestant 2: 3 episodes, declining trend
        { contestant_id: 2, score: 25, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 2, score: 20, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 2, score: 10, episodes: { id: 3, episode_number: 3 } },
        
        // Contestant 3: 2 episodes, should be n/a
        { contestant_id: 3, score: 15, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 3, score: 18, episodes: { id: 2, episode_number: 2 } }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        in: inMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        in: inMock,
        order: orderMock
      });

      inMock.mockReturnValue({
        order: orderMock
      });

      const result = await calculateMultipleContestantTrends(contestantIds);

      expect(result).toEqual({
        1: 'up',    // 30 vs (10+15)/2 = 12.5, +140% change
        2: 'down',  // 10 vs (25+20)/2 = 22.5, -55.6% change
        3: 'n/a'    // Only 2 episodes
      });

      expect(supabase.from).toHaveBeenCalledWith('episode_scores');
      expect(selectMock).toHaveBeenCalledWith(`
        contestant_id,
        score,
        episodes!inner(
          id,
          episode_number
        )
      `);
      expect(inMock).toHaveBeenCalledWith('contestant_id', contestantIds);
      expect(orderMock).toHaveBeenCalledWith('episodes(episode_number)', { ascending: true });
    });

    it('should handle database errors by returning n/a for all contestants', async () => {
      const contestantIds = [1, 2, 3];

      const selectMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        in: inMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        in: inMock,
        order: orderMock
      });

      inMock.mockReturnValue({
        order: orderMock
      });

      const result = await calculateMultipleContestantTrends(contestantIds);

      expect(result).toEqual({
        1: 'n/a',
        2: 'n/a',
        3: 'n/a'
      });
    });

    it('should handle contestants with no episode scores', async () => {
      const contestantIds = [1, 2];
      const mockEpisodeScores = [
        // Only contestant 1 has scores, contestant 2 has none
        { contestant_id: 1, score: 10, episodes: { id: 1, episode_number: 1 } },
        { contestant_id: 1, score: 15, episodes: { id: 2, episode_number: 2 } },
        { contestant_id: 1, score: 20, episodes: { id: 3, episode_number: 3 } }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        in: inMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        in: inMock,
        order: orderMock
      });

      inMock.mockReturnValue({
        order: orderMock
      });

      const result = await calculateMultipleContestantTrends(contestantIds);

      expect(result).toEqual({
        1: 'up',   // 20 vs (10+15)/2 = 12.5, +60% change
        2: 'n/a'   // No episode scores
      });
    });

    it('should handle empty contestant list', async () => {
      const contestantIds = [];

      const selectMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        in: inMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        in: inMock,
        order: orderMock
      });

      inMock.mockReturnValue({
        order: orderMock
      });

      const result = await calculateMultipleContestantTrends(contestantIds);

      expect(result).toEqual({});
    });
  });

  describe('Performance and Accuracy Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Test with 50 contestants, 10 episodes each
      const contestantIds = Array.from({ length: 50 }, (_, i) => i + 1);
      const mockEpisodeScores = [];
      
      for (let contestantId = 1; contestantId <= 50; contestantId++) {
        for (let episode = 1; episode <= 10; episode++) {
          mockEpisodeScores.push({
            contestant_id: contestantId,
            score: Math.floor(Math.random() * 30) + 5,
            episodes: { id: episode, episode_number: episode }
          });
        }
      }

      const selectMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ 
        data: mockEpisodeScores, 
        error: null 
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        in: inMock,
        order: orderMock
      });

      selectMock.mockReturnValue({
        in: inMock,
        order: orderMock
      });

      inMock.mockReturnValue({
        order: orderMock
      });

      const startTime = Date.now();
      const result = await calculateMultipleContestantTrends(contestantIds);
      const endTime = Date.now();

      expect(Object.keys(result)).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      
      // All contestants should have trends (up, down, same, or n/a)
      Object.values(result).forEach(trend => {
        expect(['up', 'down', 'same', 'n/a']).toContain(trend);
      });
    });

    it('should maintain calculation accuracy across different score ranges', () => {
      // Test with various score ranges to ensure accuracy
      const testCases = [
        {
          name: 'Small scores',
          scores: [1, 2, 3, 4],
          expected: 'up' // 4 vs (1+2)/2 = 1.5, +166% change
        },
        {
          name: 'Large scores',
          scores: [1000, 2000, 3000, 4000],
          expected: 'up' // 4000 vs (1000+2000)/2 = 1500, +166% change
        },
        {
          name: 'Decimal scores',
          scores: [1.5, 2.7, 3.1, 3.2],
          expected: 'up' // 3.2 vs (1.5+2.7)/2 = 2.1, +52% change
        }
      ];

      testCases.forEach(testCase => {
        const episodeScores = testCase.scores.map((score, index) => ({
          episode_number: index + 1,
          score: score
        }));

        const result = calculatePerformanceTrend(1, episodeScores);
        expect(result).toBe(testCase.expected);
      });
    });
  });
});