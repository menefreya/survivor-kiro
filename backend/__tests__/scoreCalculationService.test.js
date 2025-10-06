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
            const mockSelection = { contestant_id: 1, start_episode: 1 };
            const mockCurrentEpisode = { episode_number: 5 };
            const mockContestant = { is_winner: false };

            setupSoleSurvivorMocks(mockSelection, mockCurrentEpisode, mockContestant);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.episodeCount).toBe(5);
            expect(bonus.episodeBonus).toBe(5);
            expect(bonus.winnerBonus).toBe(0);
            expect(bonus.totalBonus).toBe(5);
        });

        it('should calculate bonus with switches', async () => {
            const mockSelection = { contestant_id: 2, start_episode: 4 };
            const mockCurrentEpisode = { episode_number: 6 };
            const mockContestant = { is_winner: false };

            setupSoleSurvivorMocks(mockSelection, mockCurrentEpisode, mockContestant);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.episodeCount).toBe(3);
            expect(bonus.episodeBonus).toBe(3);
        });

        it('should award winner bonus if selected by episode 2', async () => {
            const mockSelection = { contestant_id: 1, start_episode: 2 };
            const mockCurrentEpisode = { episode_number: 10 };
            const mockContestant = { is_winner: true };

            setupSoleSurvivorMocks(mockSelection, mockCurrentEpisode, mockContestant);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.winnerBonus).toBe(25);
            expect(bonus.totalBonus).toBe(34);
        });

        it('should not award winner bonus if selected after episode 2', async () => {
            const mockSelection = { contestant_id: 1, start_episode: 3 };
            const mockCurrentEpisode = { episode_number: 10 };
            const mockContestant = { is_winner: true };

            setupSoleSurvivorMocks(mockSelection, mockCurrentEpisode, mockContestant);

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.winnerBonus).toBe(0);
        });

        it('should return 0 when no sole survivor selected', async () => {
            const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
            const isMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
            const eqMock = jest.fn().mockReturnValue({ is: isMock });
            const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
            supabase.from.mockReturnValue({ select: selectMock });

            const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);

            expect(bonus.totalBonus).toBe(0);
        });
    });

    describe('calculatePlayerScore', () => {
        it('should calculate player score with all components', async () => {
            const mockDraftPicks = [
                { contestant_id: 1, contestants: { total_score: 10 } },
                { contestant_id: 2, contestants: { total_score: 8 } }
            ];
            const mockPlayer = { sole_survivor_id: 3, contestants: { total_score: 12 } };
            const mockSelection = { contestant_id: 3, start_episode: 1 };
            const mockCurrentEpisode = { episode_number: 5 };
            const mockContestant = { is_winner: false };

            setupPlayerScoreMocks(mockDraftPicks, mockPlayer, mockSelection, mockCurrentEpisode, mockContestant);

            const score = await scoreCalculationService.calculatePlayerScore(1);

            expect(score.draft_score).toBe(18);
            expect(score.sole_survivor_score).toBe(12);
            expect(score.sole_survivor_bonus).toBe(5);
            expect(score.total).toBe(35);
        });

        it('should include winner bonus in total', async () => {
            const mockDraftPicks = [{ contestant_id: 1, contestants: { total_score: 10 } }];
            const mockPlayer = { sole_survivor_id: 3, contestants: { total_score: 15 } };
            const mockSelection = { contestant_id: 3, start_episode: 1 };
            const mockCurrentEpisode = { episode_number: 10 };
            const mockContestant = { is_winner: true };

            setupPlayerScoreMocks(mockDraftPicks, mockPlayer, mockSelection, mockCurrentEpisode, mockContestant);

            const score = await scoreCalculationService.calculatePlayerScore(1);

            expect(score.sole_survivor_bonus).toBe(35);
            expect(score.total).toBe(60);
        });
    });
});

function setupSoleSurvivorMocks(mockSelection, mockCurrentEpisode, mockContestant) {
    const maybeSingleMock1 = jest.fn().mockResolvedValue({ data: mockSelection, error: null });
    const isMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock1 });
    const eqMock1 = jest.fn().mockReturnValue({ is: isMock });
    const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });

    const maybeSingleMock2 = jest.fn().mockResolvedValue({ data: mockCurrentEpisode, error: null });
    const eqMock2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock2 });
    const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock2 });

    const singleMock = jest.fn().mockResolvedValue({ data: mockContestant, error: null });
    const eqMock3 = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock3 = jest.fn().mockReturnValue({ eq: eqMock3 });

    let callCount = 0;
    supabase.from.mockImplementation((table) => {
        callCount++;
        if (callCount === 1) return { select: selectMock1 };
        if (callCount === 2) return { select: selectMock2 };
        return { select: selectMock3 };
    });
}

function setupPlayerScoreMocks(mockDraftPicks, mockPlayer, mockSelection, mockCurrentEpisode, mockContestant) {
    const eqMock1 = jest.fn().mockResolvedValue({ data: mockDraftPicks, error: null });
    const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });

    const singleMock1 = jest.fn().mockResolvedValue({ data: mockPlayer, error: null });
    const eqMock2 = jest.fn().mockReturnValue({ single: singleMock1 });
    const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock2 });

    const maybeSingleMock1 = jest.fn().mockResolvedValue({ data: mockSelection, error: null });
    const isMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock1 });
    const eqMock3 = jest.fn().mockReturnValue({ is: isMock });
    const selectMock3 = jest.fn().mockReturnValue({ eq: eqMock3 });

    const maybeSingleMock2 = jest.fn().mockResolvedValue({ data: mockCurrentEpisode, error: null });
    const eqMock4 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock2 });
    const selectMock4 = jest.fn().mockReturnValue({ eq: eqMock4 });

    const singleMock2 = jest.fn().mockResolvedValue({ data: mockContestant, error: null });
    const eqMock5 = jest.fn().mockReturnValue({ single: singleMock2 });
    const selectMock5 = jest.fn().mockReturnValue({ eq: eqMock5 });

    let callCount = 0;
    supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'draft_picks') return { select: selectMock1 };
        if (table === 'players') return { select: selectMock2 };
        if (table === 'sole_survivor_history') return { select: selectMock3 };
        if (table === 'episodes') return { select: selectMock4 };
        if (table === 'contestants') return { select: selectMock5 };
    });
}
