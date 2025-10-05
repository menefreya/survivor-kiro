const supabase = require('../db/supabase');

describe('Event API Integration Tests', () => {
  describe('GET /api/event-types', () => {
    it('should return all event types', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('id');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/episodes/:id/events', () => {
    it('should add events correctly', async () => {
      const { data: episodes } = await supabase.from('episodes').select('id').limit(1);
      const { data: contestants } = await supabase.from('contestants').select('id').limit(1);
      const { data: eventTypes } = await supabase.from('event_types').select('id, point_value').limit(1);

      if (episodes && episodes.length > 0 && contestants && contestants.length > 0 && eventTypes && eventTypes.length > 0) {
        const { data: insertedEvent, error } = await supabase
          .from('contestant_events')
          .insert({
            episode_id: episodes[0].id,
            contestant_id: contestants[0].id,
            event_type_id: eventTypes[0].id,
            point_value: eventTypes[0].point_value
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(insertedEvent).toBeDefined();

        if (insertedEvent) {
          await supabase.from('contestant_events').delete().eq('id', insertedEvent.id);
        }
      }
    });

    it('should enforce foreign key constraints', async () => {
      const { error } = await supabase
        .from('contestant_events')
        .insert({
          episode_id: 999999,
          contestant_id: 1,
          event_type_id: 1,
          point_value: 3
        });

      expect(error).not.toBeNull();
    });
  });

  describe('DELETE /api/episodes/:id/events/:id', () => {
    it('should remove events', async () => {
      const { data: episodes } = await supabase.from('episodes').select('id').limit(1);
      const { data: contestants } = await supabase.from('contestants').select('id').limit(1);
      const { data: eventTypes } = await supabase.from('event_types').select('id, point_value').limit(1);

      if (episodes && episodes.length > 0 && contestants && contestants.length > 0 && eventTypes && eventTypes.length > 0) {
        const { data: insertedEvent } = await supabase
          .from('contestant_events')
          .insert({
            episode_id: episodes[0].id,
            contestant_id: contestants[0].id,
            event_type_id: eventTypes[0].id,
            point_value: eventTypes[0].point_value
          })
          .select()
          .single();

        if (insertedEvent) {
          const { error } = await supabase.from('contestant_events').delete().eq('id', insertedEvent.id);
          expect(error).toBeNull();

          const { data: deletedEvent } = await supabase
            .from('contestant_events')
            .select('*')
            .eq('id', insertedEvent.id)
            .maybeSingle();

          expect(deletedEvent).toBeNull();
        }
      }
    });
  });

  describe('Bulk event updates', () => {
    it('should handle bulk event operations', async () => {
      const { data: episodes } = await supabase.from('episodes').select('id').limit(1);
      const { data: contestants } = await supabase.from('contestants').select('id').limit(2);
      const { data: eventTypes } = await supabase.from('event_types').select('id, point_value').limit(2);

      if (episodes && episodes.length > 0 && contestants && contestants.length >= 2 && eventTypes && eventTypes.length >= 2) {
        const eventsToInsert = [
          {
            episode_id: episodes[0].id,
            contestant_id: contestants[0].id,
            event_type_id: eventTypes[0].id,
            point_value: eventTypes[0].point_value
          },
          {
            episode_id: episodes[0].id,
            contestant_id: contestants[1].id,
            event_type_id: eventTypes[1].id,
            point_value: eventTypes[1].point_value
          }
        ];

        const { data: insertedEvents, error } = await supabase
          .from('contestant_events')
          .insert(eventsToInsert)
          .select();

        expect(error).toBeNull();
        expect(insertedEvents).toBeDefined();
        expect(insertedEvents.length).toBe(2);

        if (insertedEvents) {
          const ids = insertedEvents.map(e => e.id);
          await supabase.from('contestant_events').delete().in('id', ids);
        }
      }
    });
  });
});
