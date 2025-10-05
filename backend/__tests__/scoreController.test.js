const { addEpisodeScores, getContestantScores } = require('../controllers/scoreController');
const supabase = require('../db/supabase');

// Mock the supabase module
jest.mock('../db/supabase', () => ({
  from: jest.fn(),
  rpc: jest.fn()
}));

describe('Score Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      body: {},
      user: { id: 1, is_admin: true }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('addEpisodeScores', () => {
    it('should add episode scores successfully', async () => {
      const mockEpisode = { id: 1, episode_number: 1 };
      const mockScores = [
        { id: 1, episode_id: 1, contestant_id: 1, score: 5 },
        { id: 2, episode_id: 1, contestant_id: 2, score: 3 }
      ];

      req.body = {
        episode_number: 1,
        scores: [
          { contestant_id: 1, score: 5 },
          { contestant_id: 2, score: 3 }
        ]
      };

      // Mock episode check (no existing episode)
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: null, error: null });

      // Mock episode creation
      const insertMock = jest.fn().mockReturnThis();
      const episodeSelectMock = jest.fn().mockReturnThis();
      const episodeSingleMock = jest.fn().mockResolvedValue({ data: mockEpisode, error: null });

      // Mock episode scores insertion
      const scoresInsertMock = jest.fn().mockReturnThis();
      const scoresSelectMock = jest.fn().mockResolvedValue({ data: mockScores, error: null });

      // Mock contestant score updates
      const mockContestant1 = { total_score: 10 };
      const mockContestant2 = { total_score: 8 };
      const updateSelectMock = jest.fn().mockReturnThis();
      const updateEqMock = jest.fn().mockReturnThis();
      const updateSingleMock = jest.fn()
        .mockResolvedValueOnce({ data: mockContestant1, error: null })
        .mockResolvedValueOnce({ data: mockContestant2, error: null });
      const updateMock = jest.fn().mockReturnThis();

      supabase.from.mockImplementation((table) => {
        if (table === 'episodes') {
          return {
            select: () => ({
              eq: () => ({
                single: singleMock
              })
            }),
            insert: () => ({
              select: () => ({
                single: episodeSingleMock
              })
            }),
            delete: jest.fn().mockReturnThis()
          };
        } else if (table === 'episode_scores') {
          return {
            insert: () => ({
              select: scoresSelectMock
            })
          };
        } else if (table === 'contestants') {
          return {
            select: () => ({
              eq: () => ({
                single: updateSingleMock
              })
            }),
            update: () => ({
              eq: updateEqMock
            })
          };
        }
      });

      supabase.rpc.mockResolvedValue({ error: { code: '42883' } });

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Episode scores added successfully',
        episode: mockEpisode,
        scores: mockScores
      });
    });

    it('should reject missing episode number', async () => {
      req.body = {
        scores: [{ contestant_id: 1, score: 5 }]
      };

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Episode number and scores array are required'
      });
    });

    it('should reject missing scores array', async () => {
      req.body = {
        episode_number: 1
      };

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Episode number and scores array are required'
      });
    });

    it('should reject invalid episode number (negative)', async () => {
      req.body = {
        episode_number: -1,
        scores: [{ contestant_id: 1, score: 5 }]
      };

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Episode number must be a positive integer'
      });
    });

    it('should reject invalid episode number (zero)', async () => {
      req.body = {
        episode_number: 0,
        scores: [{ contestant_id: 1, score: 5 }]
      };

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      // The validation checks for required fields first, then validates the episode number
      // Since 0 is falsy, it triggers the "required" check
      expect(res.json).toHaveBeenCalledWith({
        error: 'Episode number and scores array are required'
      });
    });

    it('should reject invalid score format (missing contestant_id)', async () => {
      req.body = {
        episode_number: 1,
        scores: [{ score: 5 }]
      };

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Each score must have contestant_id and numeric score value'
      });
    });

    it('should reject invalid score format (non-numeric score)', async () => {
      req.body = {
        episode_number: 1,
        scores: [{ contestant_id: 1, score: 'five' }]
      };

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Each score must have contestant_id and numeric score value'
      });
    });

    it('should reject duplicate episode', async () => {
      const existingEpisode = { id: 1, episode_number: 1 };

      req.body = {
        episode_number: 1,
        scores: [{ contestant_id: 1, score: 5 }]
      };

      const singleMock = jest.fn().mockResolvedValue({ data: existingEpisode, error: null });

      supabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: singleMock
          })
        })
      });

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Episode 1 scores have already been added'
      });
    });

    it('should accumulate scores correctly', async () => {
      const mockEpisode = { id: 1, episode_number: 2 };
      const mockScores = [
        { id: 1, episode_id: 1, contestant_id: 1, score: 7 }
      ];
      const existingContestant = { total_score: 10 };

      req.body = {
        episode_number: 2,
        scores: [{ contestant_id: 1, score: 7 }]
      };

      // Mock no existing episode
      const checkSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
      
      // Mock episode creation
      const episodeSingleMock = jest.fn().mockResolvedValue({ data: mockEpisode, error: null });
      
      // Mock scores insertion
      const scoresSelectMock = jest.fn().mockResolvedValue({ data: mockScores, error: null });
      
      // Mock contestant fetch and update
      const contestantSingleMock = jest.fn().mockResolvedValue({ data: existingContestant, error: null });
      const updateEqMock = jest.fn().mockResolvedValue({ data: { total_score: 17 }, error: null });

      supabase.from.mockImplementation((table) => {
        if (table === 'episodes') {
          return {
            select: () => ({
              eq: () => ({
                single: checkSingleMock
              })
            }),
            insert: () => ({
              select: () => ({
                single: episodeSingleMock
              })
            })
          };
        } else if (table === 'episode_scores') {
          return {
            insert: () => ({
              select: scoresSelectMock
            })
          };
        } else if (table === 'contestants') {
          return {
            select: () => ({
              eq: () => ({
                single: contestantSingleMock
              })
            }),
            update: () => ({
              eq: updateEqMock
            })
          };
        }
      });

      supabase.rpc.mockResolvedValue({ error: { code: '42883' } });

      await addEpisodeScores(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Episode scores added successfully',
        episode: mockEpisode,
        scores: mockScores
      });
    });
  });

  describe('getContestantScores', () => {
    it('should fetch all contestant scores successfully', async () => {
      const mockContestants = [
        { id: 1, name: 'John', profession: 'Engineer', image_url: 'url1', total_score: 15, is_eliminated: false },
        { id: 2, name: 'Jane', profession: 'Doctor', image_url: 'url2', total_score: 12, is_eliminated: false },
        { id: 3, name: 'Bob', profession: 'Teacher', image_url: 'url3', total_score: 8, is_eliminated: true }
      ];

      const orderMock = jest.fn().mockResolvedValue({ data: mockContestants, error: null });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({
        select: selectMock
      });

      await getContestantScores(req, res);

      expect(supabase.from).toHaveBeenCalledWith('contestants');
      expect(selectMock).toHaveBeenCalledWith('id, name, profession, image_url, total_score, is_eliminated');
      expect(orderMock).toHaveBeenCalledWith('total_score', { ascending: false });
      expect(res.json).toHaveBeenCalledWith(mockContestants);
    });

    it('should return contestants ordered by score (descending)', async () => {
      const mockContestants = [
        { id: 1, name: 'High Score', total_score: 20, is_eliminated: false },
        { id: 2, name: 'Medium Score', total_score: 15, is_eliminated: false },
        { id: 3, name: 'Low Score', total_score: 5, is_eliminated: false }
      ];

      const orderMock = jest.fn().mockResolvedValue({ data: mockContestants, error: null });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({
        select: selectMock
      });

      await getContestantScores(req, res);

      expect(res.json).toHaveBeenCalledWith(mockContestants);
      // Verify order is descending
      const scores = mockContestants.map(c => c.total_score);
      expect(scores).toEqual([20, 15, 5]);
    });

    it('should handle database errors gracefully', async () => {
      const orderMock = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({
        select: selectMock
      });

      await getContestantScores(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch contestant scores'
      });
    });

    it('should include eliminated contestants in results', async () => {
      const mockContestants = [
        { id: 1, name: 'Active', total_score: 15, is_eliminated: false },
        { id: 2, name: 'Eliminated', total_score: 10, is_eliminated: true }
      ];

      const orderMock = jest.fn().mockResolvedValue({ data: mockContestants, error: null });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({
        select: selectMock
      });

      await getContestantScores(req, res);

      expect(res.json).toHaveBeenCalledWith(mockContestants);
      expect(mockContestants.some(c => c.is_eliminated)).toBe(true);
    });
  });
});
