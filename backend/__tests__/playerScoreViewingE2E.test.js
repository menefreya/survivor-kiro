const supabase = require('../db/supabase');
const scoreCalculationService = require('../services/scoreCalculationService');

describe('Player Score Viewing E2E Flow', () => {
  let testPlayerId;
  let testContestantId;

  beforeAll(async () => {
    const { data: players } = await supabase.from('players').select('id').limit(1);
    const { data: contestants } = await supabase.from('contestants').select('id').limit(1);
    
    if (players && players.length > 0) testPlayerId = players[0].id;
    if (contestants && contestants.length > 0) testContestantId = contestants[0].id;
  });

  it('should view team on home page', async () => {
    if (!testPlayerId) {
      return;
    }

    const { data: draftPicks, error } = await supabase
      .from('draft_picks')
      .select('*, contestants(*)')
      .eq('player_id', testPlayerId);

    expect(error).toBeNull();
    expect(draftPicks).toBeDefined();
  });

  it('should view score breakdown', async () => {
    if (!testContestantId) {
      return;
    }

    const { data: episodeScores, error } = await supabase
      .from('episode_scores')
      .select('*, episodes(episode_number)')
      .eq('contestant_id', testContestantId)
      .order('episode_id');

    expect(error).toBeNull();
    expect(episodeScores).toBeDefined();
  });

  it('should verify events displayed correctly', async () => {
    if (!testContestantId) {
      return;
    }

    const { data: events, error } = await supabase
      .from('contestant_events')
      .select('*, event_types(display_name, point_value), episodes(episode_number)')
      .eq('contestant_id', testContestantId)
      .order('episode_id');

    expect(error).toBeNull();
    expect(events).toBeDefined();

    if (events && events.length > 0) {
      expect(events[0]).toHaveProperty('event_types');
      expect(events[0].event_types).toHaveProperty('display_name');
      expect(events[0].event_types).toHaveProperty('point_value');
    }
  });

  it('should verify sole survivor bonus shown', async () => {
    if (!testPlayerId) {
      return;
    }

    const { data: player } = await supabase
      .from('players')
      .select('sole_survivor_id')
      .eq('id', testPlayerId)
      .single();

    if (player && player.sole_survivor_id) {
      const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(testPlayerId);

      expect(bonus).toBeDefined();
      expect(bonus).toHaveProperty('episodeBonus');
      expect(bonus).toHaveProperty('winnerBonus');
      expect(bonus).toHaveProperty('totalBonus');
    }
  });

  it('should verify totals match', async () => {
    if (!testPlayerId) {
      return;
    }

    const playerScore = await scoreCalculationService.calculatePlayerScore(testPlayerId);

    expect(playerScore).toBeDefined();
    expect(playerScore).toHaveProperty('draft_score');
    expect(playerScore).toHaveProperty('sole_survivor_score');
    expect(playerScore).toHaveProperty('sole_survivor_bonus');
    expect(playerScore).toHaveProperty('total');

    const calculatedTotal = 
      playerScore.draft_score + 
      playerScore.sole_survivor_score + 
      playerScore.sole_survivor_bonus;

    expect(playerScore.total).toBe(calculatedTotal);
  });
});
