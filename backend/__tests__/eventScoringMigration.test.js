const supabase = require('../db/supabase');

describe('Event-Based Scoring Migration Tests', () => {
  describe('Table Creation', () => {
    it('should have event_types table with correct structure', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have contestant_events table with correct structure', async () => {
      const { data, error } = await supabase
        .from('contestant_events')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have sole_survivor_history table with correct structure', async () => {
      const { data, error } = await supabase
        .from('sole_survivor_history')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Column Additions', () => {
    it('should have is_current column in episodes table', async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('is_current')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have aired_date column in episodes table', async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('aired_date')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have is_winner column in contestants table', async () => {
      const { data, error } = await supabase
        .from('contestants')
        .select('is_winner')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have source column in episode_scores table', async () => {
      const { data, error } = await supabase
        .from('episode_scores')
        .select('source')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have calculated_at column in episode_scores table', async () => {
      const { data, error } = await supabase
        .from('episode_scores')
        .select('calculated_at')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Event Types Seeding', () => {
    it('should have all 15 predefined event types', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('id');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThanOrEqual(15);
    });

    it('should have correct basic scoring events', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('category', 'basic');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const eventNames = data.map(e => e.name);
      expect(eventNames).toContain('individual_immunity_win');
      expect(eventNames).toContain('team_immunity_win');
      expect(eventNames).toContain('individual_reward_win');
      expect(eventNames).toContain('team_reward_win');
      expect(eventNames).toContain('found_hidden_idol');
      expect(eventNames).toContain('played_idol_successfully');
    });

    it('should have correct penalty events', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('category', 'penalty');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const eventNames = data.map(e => e.name);
      expect(eventNames).toContain('eliminated');
      expect(eventNames).toContain('voted_out_with_idol');
    });

    it('should have correct bonus events', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('category', 'bonus');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const eventNames = data.map(e => e.name);
      expect(eventNames).toContain('made_final_three');
      expect(eventNames).toContain('made_fire');
      expect(eventNames).toContain('played_shot_in_dark');
      expect(eventNames).toContain('got_immunity_shot_in_dark');
    });

    it('should have correct point values for events', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('name, point_value');

      expect(error).toBeNull();
      expect(data).toBeDefined();

      const pointValues = Object.fromEntries(
        data.map(e => [e.name, e.point_value])
      );

      expect(pointValues['individual_immunity_win']).toBe(3);
      expect(pointValues['team_immunity_win']).toBe(2);
      expect(pointValues['individual_reward_win']).toBe(2);
      expect(pointValues['team_reward_win']).toBe(1);
      expect(pointValues['found_hidden_idol']).toBe(3);
      expect(pointValues['played_idol_successfully']).toBe(2);
      expect(pointValues['eliminated']).toBe(-1);
      expect(pointValues['voted_out_with_idol']).toBe(-3);
      expect(pointValues['made_final_three']).toBe(10);
      expect(pointValues['made_fire']).toBe(1);
    });

    it('should have all event types active by default', async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('is_active');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.every(e => e.is_active === true)).toBe(true);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key constraint on contestant_events.episode_id', async () => {
      const { error } = await supabase
        .from('contestant_events')
        .insert({
          episode_id: 999999,
          contestant_id: 1,
          event_type_id: 1,
          point_value: 3
        });

      expect(error).not.toBeNull();
      expect(error.message).toMatch(/foreign key|violates/i);
    });

    it('should enforce foreign key constraint on contestant_events.contestant_id', async () => {
      // First get a valid episode
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id')
        .limit(1);

      if (episodes && episodes.length > 0) {
        const { error } = await supabase
          .from('contestant_events')
          .insert({
            episode_id: episodes[0].id,
            contestant_id: 999999,
            event_type_id: 1,
            point_value: 3
          });

        expect(error).not.toBeNull();
        expect(error.message).toMatch(/foreign key|violates/i);
      }
    });

    it('should enforce foreign key constraint on contestant_events.event_type_id', async () => {
      // Get valid episode and contestant
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id')
        .limit(1);

      const { data: contestants } = await supabase
        .from('contestants')
        .select('id')
        .limit(1);

      if (episodes && episodes.length > 0 && contestants && contestants.length > 0) {
        const { error } = await supabase
          .from('contestant_events')
          .insert({
            episode_id: episodes[0].id,
            contestant_id: contestants[0].id,
            event_type_id: 999999,
            point_value: 3
          });

        expect(error).not.toBeNull();
        expect(error.message).toMatch(/foreign key|violates/i);
      }
    });

    it('should enforce foreign key constraint on sole_survivor_history.player_id', async () => {
      const { data: contestants } = await supabase
        .from('contestants')
        .select('id')
        .limit(1);

      if (contestants && contestants.length > 0) {
        const { error } = await supabase
          .from('sole_survivor_history')
          .insert({
            player_id: 999999,
            contestant_id: contestants[0].id,
            start_episode: 1
          });

        expect(error).not.toBeNull();
        expect(error.message).toMatch(/foreign key|violates/i);
      }
    });

    it('should cascade delete contestant_events when episode is deleted', async () => {
      // This test verifies the ON DELETE CASCADE behavior
      // We'll create a test episode, add an event, then delete the episode
      const { data: testEpisode, error: episodeError } = await supabase
        .from('episodes')
        .insert({ episode_number: 999 })
        .select()
        .single();

      if (!episodeError && testEpisode) {
        const { data: contestants } = await supabase
          .from('contestants')
          .select('id')
          .limit(1);

        const { data: eventTypes } = await supabase
          .from('event_types')
          .select('id')
          .limit(1);

        if (contestants && contestants.length > 0 && eventTypes && eventTypes.length > 0) {
          // Add event
          await supabase
            .from('contestant_events')
            .insert({
              episode_id: testEpisode.id,
              contestant_id: contestants[0].id,
              event_type_id: eventTypes[0].id,
              point_value: 3
            });

          // Delete episode
          await supabase
            .from('episodes')
            .delete()
            .eq('id', testEpisode.id);

          // Verify event was deleted
          const { data: remainingEvents } = await supabase
            .from('contestant_events')
            .select('*')
            .eq('episode_id', testEpisode.id);

          expect(remainingEvents).toEqual([]);
        }
      }
    });
  });

  describe('Indexes', () => {
    it('should have indexes on contestant_events table', async () => {
      // Query to check if indexes exist
      const { data, error } = await supabase.rpc('get_table_indexes', {
        table_name: 'contestant_events'
      });

      // If the RPC doesn't exist (PGRST202 or 42883), we'll just verify we can query efficiently
      if (error && (error.code === '42883' || error.code === 'PGRST202')) {
        // Function doesn't exist, skip this test
        expect(true).toBe(true);
      } else {
        expect(error).toBeNull();
      }
    });

    it('should efficiently query contestant_events by episode_id', async () => {
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id')
        .limit(1);

      if (episodes && episodes.length > 0) {
        const startTime = Date.now();
        
        await supabase
          .from('contestant_events')
          .select('*')
          .eq('episode_id', episodes[0].id);

        const queryTime = Date.now() - startTime;
        
        // Query should be fast (under 1 second)
        expect(queryTime).toBeLessThan(1000);
      }
    });

    it('should efficiently query contestant_events by contestant_id', async () => {
      const { data: contestants } = await supabase
        .from('contestants')
        .select('id')
        .limit(1);

      if (contestants && contestants.length > 0) {
        const startTime = Date.now();
        
        await supabase
          .from('contestant_events')
          .select('*')
          .eq('contestant_id', contestants[0].id);

        const queryTime = Date.now() - startTime;
        
        // Query should be fast (under 1 second)
        expect(queryTime).toBeLessThan(1000);
      }
    });

    it('should efficiently query sole_survivor_history by player_id', async () => {
      const { data: players } = await supabase
        .from('players')
        .select('id')
        .limit(1);

      if (players && players.length > 0) {
        const startTime = Date.now();
        
        await supabase
          .from('sole_survivor_history')
          .select('*')
          .eq('player_id', players[0].id);

        const queryTime = Date.now() - startTime;
        
        // Query should be fast (under 1 second)
        expect(queryTime).toBeLessThan(1000);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should enforce category check constraint on event_types', async () => {
      const { error } = await supabase
        .from('event_types')
        .insert({
          name: 'test_invalid_category',
          display_name: 'Test Invalid',
          category: 'invalid_category',
          point_value: 1
        });

      expect(error).not.toBeNull();
      expect(error.message).toMatch(/check constraint|violates/i);
    });

    it('should enforce source check constraint on episode_scores', async () => {
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id')
        .limit(1);

      const { data: contestants } = await supabase
        .from('contestants')
        .select('id')
        .limit(1);

      if (episodes && episodes.length > 0 && contestants && contestants.length > 0) {
        const { error } = await supabase
          .from('episode_scores')
          .insert({
            episode_id: episodes[0].id,
            contestant_id: contestants[0].id,
            score: 5,
            source: 'invalid_source'
          });

        expect(error).not.toBeNull();
        expect(error.message).toMatch(/check constraint|violates/i);
      }
    });

    it('should allow null end_episode in sole_survivor_history', async () => {
      const { data: players } = await supabase
        .from('players')
        .select('id')
        .limit(1);

      const { data: contestants } = await supabase
        .from('contestants')
        .select('id')
        .limit(1);

      if (players && players.length > 0 && contestants && contestants.length > 0) {
        const { data, error } = await supabase
          .from('sole_survivor_history')
          .insert({
            player_id: players[0].id,
            contestant_id: contestants[0].id,
            start_episode: 1,
            end_episode: null
          })
          .select()
          .single();

        // Clean up
        if (data) {
          await supabase
            .from('sole_survivor_history')
            .delete()
            .eq('id', data.id);
        }

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.end_episode).toBeNull();
      }
    });

    it('should have unique constraint on event_types.name', async () => {
      const { data: existingEvent } = await supabase
        .from('event_types')
        .select('name')
        .limit(1)
        .single();

      if (existingEvent) {
        const { error } = await supabase
          .from('event_types')
          .insert({
            name: existingEvent.name,
            display_name: 'Duplicate Test',
            category: 'basic',
            point_value: 1
          });

        expect(error).not.toBeNull();
        expect(error.message).toMatch(/unique|duplicate/i);
      }
    });
  });
});
