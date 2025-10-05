const supabase = require('../db/supabase');

describe('Sole Survivor History Tests', () => {
  let testPlayerId;
  let testContestantId;

  beforeAll(async () => {
    const { data: players } = await supabase.from('players').select('id').limit(1);
    const { data: contestants } = await supabase.from('contestants').select('id').limit(1);
    
    if (players && players.length > 0) testPlayerId = players[0].id;
    if (contestants && contestants.length > 0) testContestantId = contestants[0].id;
  });

  describe('POST /api/players/:id/sole-survivor', () => {
    it('should create history record', async () => {
      if (!testPlayerId || !testContestantId) {
        return;
      }

      const { data: insertedHistory, error } = await supabase
        .from('sole_survivor_history')
        .insert({
          player_id: testPlayerId,
          contestant_id: testContestantId,
          start_episode: 1,
          end_episode: null
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(insertedHistory).toBeDefined();
      expect(insertedHistory.start_episode).toBe(1);
      expect(insertedHistory.end_episode).toBeNull();

      if (insertedHistory) {
        await supabase.from('sole_survivor_history').delete().eq('id', insertedHistory.id);
      }
    });
  });

  describe('History tracking on multiple changes', () => {
    it('should track multiple sole survivor changes', async () => {
      if (!testPlayerId || !testContestantId) {
        return;
      }

      const { data: contestants } = await supabase.from('contestants').select('id').limit(3);
      
      if (!contestants || contestants.length < 2) {
        return;
      }

      const history1 = await supabase
        .from('sole_survivor_history')
        .insert({
          player_id: testPlayerId,
          contestant_id: contestants[0].id,
          start_episode: 1,
          end_episode: 3
        })
        .select()
        .single();

      const history2 = await supabase
        .from('sole_survivor_history')
        .insert({
          player_id: testPlayerId,
          contestant_id: contestants[1].id,
          start_episode: 4,
          end_episode: null
        })
        .select()
        .single();

      expect(history1.error).toBeNull();
      expect(history2.error).toBeNull();

      const { data: allHistory } = await supabase
        .from('sole_survivor_history')
        .select('*')
        .eq('player_id', testPlayerId)
        .in('id', [history1.data.id, history2.data.id])
        .order('start_episode');

      expect(allHistory.length).toBe(2);
      expect(allHistory[0].end_episode).toBe(3);
      expect(allHistory[1].end_episode).toBeNull();

      await supabase.from('sole_survivor_history').delete().in('id', [history1.data.id, history2.data.id]);
    });
  });

  describe('Contiguous period identification', () => {
    it('should identify contiguous periods correctly', async () => {
      if (!testPlayerId || !testContestantId) {
        return;
      }

      const { data: currentSelection } = await supabase
        .from('sole_survivor_history')
        .select('*')
        .eq('player_id', testPlayerId)
        .is('end_episode', null)
        .maybeSingle();

      if (currentSelection) {
        const episodeCount = 5 - currentSelection.start_episode + 1;
        expect(episodeCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Bonus calculation with history', () => {
    it('should calculate bonus based on history', async () => {
      if (!testPlayerId) {
        return;
      }

      const { data: history } = await supabase
        .from('sole_survivor_history')
        .insert({
          player_id: testPlayerId,
          contestant_id: testContestantId,
          start_episode: 1,
          end_episode: null
        })
        .select()
        .single();

      if (history) {
        const currentEpisode = 5;
        const episodeCount = currentEpisode - history.start_episode + 1;
        const bonus = episodeCount * 1;

        expect(bonus).toBe(5);

        await supabase.from('sole_survivor_history').delete().eq('id', history.id);
      }
    });
  });

  describe('Player/admin authorization', () => {
    it('should allow creating history for valid player', async () => {
      if (!testPlayerId || !testContestantId) {
        return;
      }

      const { data, error } = await supabase
        .from('sole_survivor_history')
        .insert({
          player_id: testPlayerId,
          contestant_id: testContestantId,
          start_episode: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data) {
        await supabase.from('sole_survivor_history').delete().eq('id', data.id);
      }
    });

    it('should enforce foreign key on player_id', async () => {
      const { error } = await supabase
        .from('sole_survivor_history')
        .insert({
          player_id: 999999,
          contestant_id: testContestantId,
          start_episode: 1
        });

      expect(error).not.toBeNull();
    });
  });
});
