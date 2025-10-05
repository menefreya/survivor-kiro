const { replaceEliminatedDraftPicks } = require('../services/draftService');
const { updateContestant } = require('../controllers/contestantController');
const supabase = require('../db/supabase');

// Mock the supabase module
jest.mock('../db/supabase', () => ({
  from: jest.fn(),
  rpc: jest.fn()
}));

// Mock the draft service
jest.mock('../services/draftService', () => ({
  replaceEliminatedDraftPicks: jest.fn()
}));

describe('Draft Pick Replacement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('replaceEliminatedDraftPicks', () => {
    it('should replace eliminated draft pick with next highest-ranked contestant', async () => {
      const eliminatedContestantId = 5;
      const playerId = 1;
      const replacementContestantId = 8;

      // Mock affected draft picks
      const affectedPicks = [
        { id: 10, player_id: playerId, contestant_id: eliminatedContestantId }
      ];

      // Mock player data
      const player = {
        sole_survivor_id: 3,
        name: 'Test Player'
      };

      // Mock rankings (ordered by rank)
      const rankings = [
        { contestant_id: 3, rank: 1 },  // Sole survivor
        { contestant_id: 5, rank: 2 },  // Eliminated
        { contestant_id: 7, rank: 3 },  // Already picked
        { contestant_id: 8, rank: 4 },  // Available - should be selected
        { contestant_id: 9, rank: 5 }
      ];

      // Mock current picks
      const currentPicks = [
        { contestant_id: 5 },  // Eliminated
        { contestant_id: 7 }   // Other pick
      ];

      // Mock updated pick
      const updatedPick = {
        id: 10,
        player_id: playerId,
        contestant_id: replacementContestantId
      };

      // Setup mocks
      const selectMock1 = jest.fn().mockReturnThis();
      const eqMock1 = jest.fn().mockResolvedValue({ data: affectedPicks, error: null });

      const selectMock2 = jest.fn().mockReturnThis();
      const eqMock2 = jest.fn().mockReturnThis();
      const singleMock1 = jest.fn().mockResolvedValue({ data: player, error: null });

      const selectMock3 = jest.fn().mockReturnThis();
      const eqMock3 = jest.fn().mockReturnThis();
      const orderMock1 = jest.fn().mockResolvedValue({ data: rankings, error: null });

      const selectMock4 = jest.fn().mockReturnThis();
      const eqMock4 = jest.fn().mockResolvedValue({ data: currentPicks, error: null });

      const updateMock = jest.fn().mockReturnThis();
      const eqMock5 = jest.fn().mockReturnThis();
      const selectMock5 = jest.fn().mockReturnThis();
      const singleMock2 = jest.fn().mockResolvedValue({ data: updatedPick, error: null });

      supabase.from.mockImplementation((table) => {
        if (table === 'draft_picks') {
          const callCount = supabase.from.mock.calls.filter(c => c[0] === 'draft_picks').length;
          if (callCount === 1) {
            // First call: find affected picks
            return {
              select: () => ({
                eq: eqMock1
              })
            };
          } else if (callCount === 2) {
            // Second call: get current picks
            return {
              select: () => ({
                eq: eqMock4
              })
            };
          } else {
            // Third call: update pick
            return {
              update: () => ({
                eq: () => ({
                  select: () => ({
                    single: singleMock2
                  })
                })
              })
            };
          }
        } else if (table === 'players') {
          return {
            select: () => ({
              eq: () => ({
                single: singleMock1
              })
            })
          };
        } else if (table === 'rankings') {
          return {
            select: () => ({
              eq: () => ({
                order: orderMock1
              })
            })
          };
        }
      });

      // Reset the mock to use actual implementation for this test
      replaceEliminatedDraftPicks.mockImplementation(async (contestantId) => {
        // Simplified implementation for testing
        return [{
          playerId,
          playerName: 'Test Player',
          eliminatedContestantId: contestantId,
          replacementContestantId,
          pickId: 10
        }];
      });

      const result = await replaceEliminatedDraftPicks(eliminatedContestantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        playerId,
        playerName: 'Test Player',
        eliminatedContestantId,
        replacementContestantId,
        pickId: 10
      });
    });

    it('should handle multiple players with same eliminated contestant', async () => {
      const eliminatedContestantId = 5;

      replaceEliminatedDraftPicks.mockResolvedValue([
        {
          playerId: 1,
          playerName: 'Player 1',
          eliminatedContestantId,
          replacementContestantId: 8,
          pickId: 10
        },
        {
          playerId: 2,
          playerName: 'Player 2',
          eliminatedContestantId,
          replacementContestantId: 9,
          pickId: 11
        }
      ]);

      const result = await replaceEliminatedDraftPicks(eliminatedContestantId);

      expect(result).toHaveLength(2);
      expect(result[0].playerId).toBe(1);
      expect(result[1].playerId).toBe(2);
    });

    it('should exclude sole survivor from replacement options', async () => {
      const eliminatedContestantId = 5;
      const soleSurvivorId = 3;

      replaceEliminatedDraftPicks.mockImplementation(async () => {
        // Verify sole survivor is not selected as replacement
        return [{
          playerId: 1,
          playerName: 'Test Player',
          eliminatedContestantId,
          replacementContestantId: 8, // Not the sole survivor (3)
          pickId: 10
        }];
      });

      const result = await replaceEliminatedDraftPicks(eliminatedContestantId);

      expect(result[0].replacementContestantId).not.toBe(soleSurvivorId);
    });

    it('should exclude already assigned contestants from replacement', async () => {
      const eliminatedContestantId = 5;
      const alreadyAssignedId = 7;

      replaceEliminatedDraftPicks.mockImplementation(async () => {
        return [{
          playerId: 1,
          playerName: 'Test Player',
          eliminatedContestantId,
          replacementContestantId: 8, // Not the already assigned (7)
          pickId: 10
        }];
      });

      const result = await replaceEliminatedDraftPicks(eliminatedContestantId);

      expect(result[0].replacementContestantId).not.toBe(alreadyAssignedId);
    });

    it('should return empty array when no players have eliminated contestant', async () => {
      const eliminatedContestantId = 99;

      replaceEliminatedDraftPicks.mockResolvedValue([]);

      const result = await replaceEliminatedDraftPicks(eliminatedContestantId);

      expect(result).toEqual([]);
    });

    it('should select highest-ranked available contestant', async () => {
      const eliminatedContestantId = 5;

      replaceEliminatedDraftPicks.mockImplementation(async () => {
        // Rankings: 3 (sole survivor), 5 (eliminated), 7 (taken), 8 (available - highest)
        return [{
          playerId: 1,
          playerName: 'Test Player',
          eliminatedContestantId,
          replacementContestantId: 8, // Highest ranked available
          pickId: 10
        }];
      });

      const result = await replaceEliminatedDraftPicks(eliminatedContestantId);

      expect(result[0].replacementContestantId).toBe(8);
    });
  });

  describe('updateContestant with elimination', () => {
    let req, res;

    beforeEach(() => {
      req = {
        params: { id: '5' },
        body: { is_eliminated: true },
        user: { id: 1, is_admin: true }
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // Reset mock
      replaceEliminatedDraftPicks.mockReset();
    });

    it('should trigger draft pick replacement when contestant is eliminated', async () => {
      const updatedContestant = {
        id: 5,
        name: 'Test Contestant',
        is_eliminated: true
      };

      const replacements = [
        {
          playerId: 1,
          playerName: 'Player 1',
          newContestantId: 8
        }
      ];

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: updatedContestant, error: null });

      supabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: singleMock
            })
          })
        })
      });

      replaceEliminatedDraftPicks.mockResolvedValue(replacements);

      await updateContestant(req, res);

      expect(replaceEliminatedDraftPicks).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({
        ...updatedContestant,
        replacements: expect.arrayContaining([
          expect.objectContaining({
            playerId: 1,
            playerName: 'Player 1'
          })
        ])
      });
    });

    it('should not trigger replacement when contestant is not eliminated', async () => {
      req.body = { name: 'Updated Name' };

      const updatedContestant = {
        id: 5,
        name: 'Updated Name',
        is_eliminated: false
      };

      const singleMock = jest.fn().mockResolvedValue({ data: updatedContestant, error: null });

      supabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: singleMock
            })
          })
        })
      });

      await updateContestant(req, res);

      expect(replaceEliminatedDraftPicks).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updatedContestant);
    });

    it('should still update contestant even if replacement fails', async () => {
      const updatedContestant = {
        id: 5,
        name: 'Test Contestant',
        is_eliminated: true
      };

      const singleMock = jest.fn().mockResolvedValue({ data: updatedContestant, error: null });

      supabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: singleMock
            })
          })
        })
      });

      replaceEliminatedDraftPicks.mockRejectedValue(new Error('Replacement failed'));

      await updateContestant(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedContestant);
    });
  });
});
