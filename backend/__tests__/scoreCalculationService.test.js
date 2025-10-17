const scoreCalculationService = require('../services/scoreCalculationService');
const supabase = require('../db/supabase');

jest.mock('../db/supabase', () => ({
    from: jest.fn()
}));

describe('Score Calculation Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateEpisodeScore', () => {
        it('should calculate episode score with various event combinations', async () => {
            const episodeId = 1;
            const contestantId = 1;
            const mockEvents = [
                { point_value: 3 },
                { point_value: 2 },
                { point_value: 3 }
            ];

            const eqMock2 = jest.fn().mockResolvedValue({ data: mockEvents, error: null });
            const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
            const selectMock = jest.fn().mockReturnValue({ eq: eqMock1 });
            supabase.from.mockReturnValue({ select: selectMock });

            const score = await scoreCalculationService.calculateEpisodeScore(episodeId, contestantId);

            expect(score).toBe(8);
        });

        it('should handle negative point values', async () => {
            const mockEvents = [{ point_value: 3 }, { point_value: -5 }];
            const eqMock2 = jest.fn().mockResolvedValue({ data: mockEvents, error: null });
            const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
            const selectMock = jest.fn().mockReturnValue({ eq: eqMock1 });
            supabase.from.mockReturnValue({ select: selectMock });

            const score = await scoreCalculationService.calculateEpisodeScore(1, 1);

            expect(score).toBe(-2);
        });

        it('should return 0 for empty event list', async () => {
            const eqMock2 = jest.fn().mockResolvedValue({ data: [], error: null });
            const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
            const selectMock = jest.fn().mockReturnValue({ eq: eqMock1 });
            supabase.from.mockReturnValue({ select: selectMock });

            const score = await scoreCalculationService.calculateEpisodeScore(1, 1);

            expect(score).toBe(0);
        });
    });

    describe('updateContestantTotalScore', () => {
        it('should update contestant total score with multiple episodes', async () => {
            const contestantId = 1;
            const mockEpisodeScores = [{ score: 5 }, { score: 3 }, { score: 7 }];

            const eqMock = jest.fn().mockResolvedValue({ data: mockEpisodeScores, error: null });
            const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
            const updateEqMock = jest.fn().mockResolvedValue({ error: null });
            const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

            let callCount = 0;
            supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1) {
                    return { select: selectMock };
                } else {
                    return { update: updateMock };
                }
            });

            const totalScore = await scoreCalculationService.updateContestantTotalScore(contestantId);

            expect(totalScore).toBe(15);
        });

        it('should handle contestants with no scores', async () => {
            const eqMock = jest.fn().mockResolvedValue({ data: [], error: null });
            const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
            const updateEqMock = jest.fn().mockResolvedValue({ error: null });
            const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

            let callCount = 0;
            supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return { select: selectMock };
                } else {
                    return { update: updateMock };
                }
            });

            const totalScore = await scoreCalculationService.updateContestantTotalScore(1);

            expect(totalScore).toBe(0);
        });
    });

    describe('calculateSoleSurvivorBonus', () => {
        it('should calculate bonus with contiguous periods', async () => {
            const mockSelections = [{ contestant_id: 1, start_episode: 1, end_episode: null }];
            const mockCurrentEpisode = { episode_number: 5 };
            const mockRemainingContestants = [{ id: 1, is_winner: false }];

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.episodeCount).toBe(5);
            expect(bonus.episodeBonus).toBe(5);
            expect(bonus.winnerBonus).toBe(0);
            expect(bonus.totalBonus).toBe(5);
        });

        it('should calculate bonus with switches', async () => {
            const mockSelections = [
                { contestant_id: 1, start_episode: 1, end_episode: 3 },
                { contestant_id: 2, start_episode: 4, end_episode: null }
            ];
            const mockCurrentEpisode = { episode_number: 6 };
            const mockRemainingContestants = [{ id: 2, is_winner: false }];

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.episodeCount).toBe(3); // Episodes 4, 5, 6
            expect(bonus.episodeBonus).toBe(3);
        });

        it('should award winner bonus if selected by episode 2', async () => {
            const mockSelections = [{ contestant_id: 1, start_episode: 2, end_episode: null }];
            const mockCurrentEpisode = { episode_number: 10 };
            const mockRemainingContestants = [{ id: 1, is_winner: true }];

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.winnerBonus).toBe(50);
            expect(bonus.finalThreeBonus).toBe(0);
            expect(bonus.totalBonus).toBe(59); // 9 episodes + 50 winner bonus
        });

        it('should not award winner bonus if selected after episode 2', async () => {
            const mockSelections = [{ contestant_id: 1, start_episode: 3, end_episode: null }];
            const mockCurrentEpisode = { episode_number: 10 };
            const mockRemainingContestants = [{ id: 1, is_winner: true }];

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.winnerBonus).toBe(0);
            expect(bonus.finalThreeBonus).toBe(0);
        });

        it('should award final three bonus if selected before episode 2', async () => {
            const mockSelections = [{ contestant_id: 1, start_episode: 1, end_episode: null }];
            const mockCurrentEpisode = { episode_number: 10 };
            const mockRemainingContestants = [{ id: 1, is_winner: false }];
            const mockFinalThreeEvent = { id: 1, event_types: { event_name: 'made_final_three' } };

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants, mockFinalThreeEvent);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.finalThreeBonus).toBe(10);
            expect(bonus.winnerBonus).toBe(0);
            expect(bonus.totalBonus).toBe(20); // 10 episodes + 10 final three bonus
        });

        it('should not award final three bonus if selected at episode 2 or later', async () => {
            const mockSelections = [{ contestant_id: 1, start_episode: 2, end_episode: null }];
            const mockCurrentEpisode = { episode_number: 10 };
            const mockRemainingContestants = [{ id: 1, is_winner: false }];
            const mockFinalThreeEvent = { id: 1, event_types: { event_name: 'made_final_three' } };

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants, mockFinalThreeEvent);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.finalThreeBonus).toBe(0);
        });

        it('should award both winner and final three bonuses if selected before episode 2', async () => {
            const mockSelections = [{ contestant_id: 1, start_episode: 1, end_episode: null }];
            const mockCurrentEpisode = { episode_number: 10 };
            const mockRemainingContestants = [{ id: 1, is_winner: true }];
            const mockFinalThreeEvent = { id: 1, event_types: { event_name: 'made_final_three' } };

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants, mockFinalThreeEvent);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.finalThreeBonus).toBe(10);
            expect(bonus.winnerBonus).toBe(50);
            expect(bonus.totalBonus).toBe(70); // 10 episodes + 10 final three + 50 winner bonus
        });

        it('should return 0 when no sole survivor selected', async () => {
            const mockSelections = [];
            const mockCurrentEpisode = { episode_number: 5 };
            const mockRemainingContestants = [{ id: 1, is_winner: false }];

            setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.totalBonus).toBe(0);
        });
    });

    describe('calculatePlayerScore', () => {
        it('should calculate player score with all components', async () => {
            // Mock the methods that have complex database queries
            const originalScoreMethod = scoreCalculationService.calculateContestantScoreForEpisodeRange;
            const originalScoreByNumberMethod = scoreCalculationService.calculateContestantScoreForEpisodeRangeByNumber;
            const originalBonusMethod = scoreCalculationService.calculateSoleSurvivorBonus;
            
            scoreCalculationService.calculateContestantScoreForEpisodeRange = jest.fn()
                .mockResolvedValueOnce(10) // First draft pick
                .mockResolvedValueOnce(8); // Second draft pick

            scoreCalculationService.calculateContestantScoreForEpisodeRangeByNumber = jest.fn()
                .mockResolvedValueOnce(12); // Sole survivor

            scoreCalculationService.calculateSoleSurvivorBonus = jest.fn()
                .mockResolvedValue({ totalBonus: 5 });

            const mockDraftPicks = [
                { contestant_id: 1, start_episode: 1, end_episode: null },
                { contestant_id: 2, start_episode: 1, end_episode: null }
            ];
            const mockSoleSurvivorHistory = [
                { contestant_id: 3, start_episode: 1, end_episode: null }
            ];

            // Simple mock for draft picks and sole survivor history
            const eqMock1 = jest.fn().mockResolvedValue({ data: mockDraftPicks, error: null });
            const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });

            const orderMock2 = jest.fn().mockResolvedValue({ data: mockSoleSurvivorHistory, error: null });
            const eqMock2 = jest.fn().mockReturnValue({ order: orderMock2 });
            const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock2 });

            supabase.from.mockImplementation((table) => {
                if (table === 'draft_picks') return { select: selectMock1 };
                if (table === 'sole_survivor_history') return { select: selectMock2 };
                return { select: selectMock1 };
            });

            const score = await scoreCalculationService.calculatePlayerScore(1);

            expect(score.draft_score).toBe(18); // 10 + 8
            expect(score.sole_survivor_score).toBe(12); // 12
            expect(score.sole_survivor_bonus).toBe(5); // Mocked value
            expect(score.total).toBe(35); // 18 + 12 + 5

            // Restore original methods
            scoreCalculationService.calculateContestantScoreForEpisodeRange = originalScoreMethod;
            scoreCalculationService.calculateContestantScoreForEpisodeRangeByNumber = originalScoreByNumberMethod;
            scoreCalculationService.calculateSoleSurvivorBonus = originalBonusMethod;
        });

        it('should include winner bonus in total', async () => {
            // Mock the methods that have complex database queries
            const originalScoreMethod = scoreCalculationService.calculateContestantScoreForEpisodeRange;
            const originalScoreByNumberMethod = scoreCalculationService.calculateContestantScoreForEpisodeRangeByNumber;
            const originalBonusMethod = scoreCalculationService.calculateSoleSurvivorBonus;
            
            scoreCalculationService.calculateContestantScoreForEpisodeRange = jest.fn()
                .mockResolvedValueOnce(10); // Draft pick

            scoreCalculationService.calculateContestantScoreForEpisodeRangeByNumber = jest.fn()
                .mockResolvedValueOnce(15); // Sole survivor

            scoreCalculationService.calculateSoleSurvivorBonus = jest.fn()
                .mockResolvedValue({ totalBonus: 35 }); // 10 episodes + 25 winner bonus

            const mockDraftPicks = [{ contestant_id: 1, start_episode: 1, end_episode: null }];
            const mockSoleSurvivorHistory = [
                { contestant_id: 3, start_episode: 1, end_episode: null }
            ];

            // Simple mock for draft picks and sole survivor history
            const eqMock1 = jest.fn().mockResolvedValue({ data: mockDraftPicks, error: null });
            const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });

            const orderMock2 = jest.fn().mockResolvedValue({ data: mockSoleSurvivorHistory, error: null });
            const eqMock2 = jest.fn().mockReturnValue({ order: orderMock2 });
            const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock2 });

            supabase.from.mockImplementation((table) => {
                if (table === 'draft_picks') return { select: selectMock1 };
                if (table === 'sole_survivor_history') return { select: selectMock2 };
                return { select: selectMock1 };
            });

            const score = await scoreCalculationService.calculatePlayerScore(1);

            expect(score.sole_survivor_bonus).toBe(35); // Mocked value
            expect(score.total).toBe(60); // 10 draft + 15 sole survivor + 35 bonus

            // Restore original methods
            scoreCalculationService.calculateContestantScoreForEpisodeRange = originalScoreMethod;
            scoreCalculationService.calculateContestantScoreForEpisodeRangeByNumber = originalScoreByNumberMethod;
            scoreCalculationService.calculateSoleSurvivorBonus = originalBonusMethod;
        });
    });
});

function setupSoleSurvivorMocks(mockSelections, mockCurrentEpisode, mockRemainingContestants, mockFinalThreeEvent = null) {
    // Mock sole_survivor_history query (returns array of selections)
    const orderMock1 = jest.fn().mockResolvedValue({ data: mockSelections, error: null });
    const eqMock1 = jest.fn().mockReturnValue({ order: orderMock1 });
    const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });

    // Mock current episode query
    const maybeSingleMock2 = jest.fn().mockResolvedValue({ data: mockCurrentEpisode, error: null });
    const eqMock2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock2 });
    const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock2 });

    // Mock remaining contestants query
    const eqMock3 = jest.fn().mockResolvedValue({ data: mockRemainingContestants, error: null });
    const selectMock3 = jest.fn().mockReturnValue({ eq: eqMock3 });

    // Mock final three event query (contestant_events)
    const maybeSingleMock4 = jest.fn().mockResolvedValue({ data: mockFinalThreeEvent, error: null });
    const eqMock4_2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock4 });
    const eqMock4_1 = jest.fn().mockReturnValue({ eq: eqMock4_2 });
    const selectMock4 = jest.fn().mockReturnValue({ eq: eqMock4_1 });

    let callCount = 0;
    supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'sole_survivor_history') return { select: selectMock1 };
        if (table === 'episodes') return { select: selectMock2 };
        if (table === 'contestants') return { select: selectMock3 };
        if (table === 'contestant_events') return { select: selectMock4 };
        return { select: selectMock1 }; // fallback
    });
}

function setupPlayerScoreMocks(mockDraftPicks, mockSoleSurvivorHistory, mockSelections, mockCurrentEpisode, mockRemainingContestants) {
    // Mock draft_picks query
    const eqMock1 = jest.fn().mockResolvedValue({ data: mockDraftPicks, error: null });
    const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });

    // Mock sole_survivor_history query
    const orderMock2 = jest.fn().mockResolvedValue({ data: mockSoleSurvivorHistory, error: null });
    const eqMock2 = jest.fn().mockReturnValue({ order: orderMock2 });
    const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock2 });

    // Mock episodes queries (for calculateContestantScoreForEpisodeRange)
    const singleMock3 = jest.fn().mockResolvedValue({ data: { episode_number: 1 }, error: null });
    const eqMock3 = jest.fn().mockReturnValue({ single: singleMock3 });
    const selectMock3 = jest.fn().mockReturnValue({ eq: eqMock3 });

    // Mock episode_scores queries (for calculateContestantScoreForEpisodeRange)
    const eqMock4 = jest.fn().mockResolvedValue({ data: [], error: null });
    const selectMock4 = jest.fn().mockReturnValue({ eq: eqMock4 });

    // Mock current episode query (for calculateSoleSurvivorBonus)
    const maybeSingleMock5 = jest.fn().mockResolvedValue({ data: mockCurrentEpisode, error: null });
    const eqMock5 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock5 });
    const selectMock5 = jest.fn().mockReturnValue({ eq: eqMock5 });

    // Mock remaining contestants query (for calculateSoleSurvivorBonus)
    const eqMock6 = jest.fn().mockResolvedValue({ data: mockRemainingContestants, error: null });
    const selectMock6 = jest.fn().mockReturnValue({ eq: eqMock6 });

    // Mock sole_survivor_history query for bonus calculation
    const orderMock7 = jest.fn().mockResolvedValue({ data: mockSelections, error: null });
    const eqMock7 = jest.fn().mockReturnValue({ order: orderMock7 });
    const selectMock7 = jest.fn().mockReturnValue({ eq: eqMock7 });

    let callCount = 0;
    supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'draft_picks') return { select: selectMock1 };
        if (table === 'sole_survivor_history' && callCount <= 2) return { select: selectMock2 };
        if (table === 'episodes' && callCount <= 10) return { select: selectMock3 };
        if (table === 'episode_scores') return { select: selectMock4 };
        if (table === 'episodes' && callCount > 10) return { select: selectMock5 };
        if (table === 'contestants') return { select: selectMock6 };
        if (table === 'sole_survivor_history' && callCount > 2) return { select: selectMock7 };
        return { select: selectMock1 }; // fallback
    });
}
