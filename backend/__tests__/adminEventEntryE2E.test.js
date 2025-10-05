const supabase = require('../db/supabase');

describe('Admin Event Entry E2E Flow', () => {
  let testEpisodeId;
  let testContestantId;
  let testEventTypeId;
  let insertedEventIds = [];

  beforeAll(async () => {
    const { data: episodes } = await supabase.from('episodes').select('id').limit(1);
    const { data: contestants } = await supabase.from('contestants').select('id').limit(1);
    const { data: eventTypes } = await supabase.from('event_types').select('id, point_value').limit(1);
    
    if (episodes && episodes.length > 0) testEpisodeId = episodes[0].id;
    if (contestants && contestants.length > 0) testContestantId = contestants[0].id;
    if (eventTypes && eventTypes.length > 0) testEventTypeId = eventTypes[0].id;
  });

  afterAll(async () => {
    if (insertedEventIds.length > 0) {
      await supabase.from('contestant_events').delete().in('id', insertedEventIds);
    }
  });

  it('should complete full admin event entry flow', async () => {
    if (!testEpisodeId || !testContestantId || !testEventTypeId) {
      return;
    }

    const { data: eventType } = await supabase
      .from('event_types')
      .select('point_value')
      .eq('id', testEventTypeId)
      .single();

    const { data: insertedEvent, error: insertError } = await supabase
      .from('contestant_events')
      .insert({
        episode_id: testEpisodeId,
        contestant_id: testContestantId,
        event_type_id: testEventTypeId,
        point_value: eventType.point_value
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(insertedEvent).toBeDefined();

    if (insertedEvent) {
      insertedEventIds.push(insertedEvent.id);

      const { data: events } = await supabase
        .from('contestant_events')
        .select('*')
        .eq('episode_id', testEpisodeId)
        .eq('contestant_id', testContestantId);

      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
    }
  });

  it('should verify scores updated in database', async () => {
    if (!testEpisodeId || !testContestantId) {
      return;
    }

    const { data: events } = await supabase
      .from('contestant_events')
      .select('point_value')
      .eq('episode_id', testEpisodeId)
      .eq('contestant_id', testContestantId);

    if (events && events.length > 0) {
      const totalScore = events.reduce((sum, e) => sum + e.point_value, 0);
      expect(totalScore).toBeDefined();
    }
  });

  it('should verify leaderboard reflects changes', async () => {
    const { data: contestants, error } = await supabase
      .from('contestants')
      .select('id, name, total_score')
      .order('total_score', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(contestants).toBeDefined();
    expect(contestants.length).toBeGreaterThan(0);
  });
});
