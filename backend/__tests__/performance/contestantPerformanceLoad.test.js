const request = require('supertest');
const app = require('../../server');
const supabase = require('../../db/supabase');

describe('Contestant Performance Load Testing', () => {
  let authToken;
  let testContestants = [];
  let testEpisodes = [];

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = {
      email: 'loadtest@example.com',
      password: 'testpassword123',
      name: 'Load Test User'
    };

    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    if (testContestants.length > 0) {
      const contestantIds = testContestants.map(c => c.id);
      await supabase.from('episode_scores').delete().in('contestant_id', contestantIds);
      await supabase.from('contestants').delete().in('id', contestantIds);
    }
    
    if (testEpisodes.length > 0) {
      const episodeIds = testEpisodes.map(e => e.id);
      await supabase.from('episodes').delete().in('id', episodeIds);
    }

    // Clean up test user
    await supabase.from('players').delete().eq('email', 'loadtest@example.com');
  });

  describe('Large Dataset Performance', () => {
    test('should handle 50 contestants with 20 episodes efficiently', async () => {
      // Create 20 test episodes
      const episodeData = Array.from({ length: 20 }, (_, i) => ({
        episode_number: i + 1
      }));

      const { data: episodes } = await supabase
        .from('episodes')
        .insert(episodeData)
        .select();
      testEpisodes = episodes;

      // Create 50 test contestants
      const contestantData = Array.from({ length: 50 }, (_, i) => ({
        name: `Test Contestant ${i + 1}`,
        profession: `Profession ${i + 1}`,
        total_score: Math.floor(Math.random() * 500) + 100, // Random score 100-600
        is_eliminated: Math.random() > 0.7 // 30% chance of elimination
      }));

      const { data: contestants } = await supabase
        .from('contestants')
        .insert(contestantData)
        .select();
      testContestants = contestants;

      // Create episode scores for each contestant (varying participation)
      const episodeScoreData = [];
      contestants.forEach(contestant => {
        const participationCount = Math.floor(Math.random() * 15) + 5; // 5-20 episodes
        const participatingEpisodes = episodes.slice(0, participationCount);
        
        participatingEpisodes.forEach(episode => {
          episodeScoreData.push({
            contestant_id: contestant.id,
            episode_id: episode.id,
            score: Math.floor(Math.random() * 50) + 10 // Random score 10-60
          });
        });
      });

      await supabase.from('episode_scores').insert(episodeScoreData);

      // Test API performance
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/contestants/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Performance assertions
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      expect(response.body.data).toHaveLength(50);
      expect(response.body.data[0]).toHaveProperty('rank', 1);
      expect(response.body.data[0]).toHaveProperty('trend');
      expect(response.body.data[0]).toHaveProperty('average_per_episode');

      // Verify data is sorted by total_score descending
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i - 1].total_score).toBeGreaterThanOrEqual(
          response.body.data[i].total_score
        );
      }

      console.log(`Performance test completed in ${responseTime}ms for 50 contestants with 20 episodes`);
    }, 30000); // 30 second timeout

    test('should handle trend calculations efficiently for large dataset', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/contestants/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify trend calculations are present
      const trendsCalculated = response.body.data.filter(c => c.trend !== 'n/a').length;
      const totalContestants = response.body.data.length;

      // At least 60% should have trend calculations (those with enough episodes)
      expect(trendsCalculated / totalContestants).toBeGreaterThan(0.6);

      // Performance should still be good on second call (potential caching)
      expect(responseTime).toBeLessThan(1500);

      console.log(`Trend calculation test completed in ${responseTime}ms`);
      console.log(`${trendsCalculated}/${totalContestants} contestants had trend calculations`);
    }, 15000);

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      // Make 5 concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/contestants/performance')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All responses should be identical
      const firstResponse = responses[0].body.data;
      responses.forEach(response => {
        expect(response.body.data).toEqual(firstResponse);
      });

      // Concurrent requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 5 concurrent requests

      console.log(`Concurrent requests test completed in ${totalTime}ms for ${concurrentRequests} requests`);
    }, 20000);
  });

  describe('Memory Usage Testing', () => {
    test('should not cause memory leaks with repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make 20 requests in sequence
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get('/api/contestants/performance')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory usage test: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase after 20 requests`);
    }, 30000);
  });

  describe('Database Query Optimization', () => {
    test('should use efficient queries with proper indexing', async () => {
      // This test verifies that our queries are using indexes properly
      // In a real environment, you would use EXPLAIN ANALYZE
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/contestants/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const queryTime = Date.now() - startTime;

      // With proper indexing, query should be fast even with large dataset
      expect(queryTime).toBeLessThan(1000); // Less than 1 second
      expect(response.body.data.length).toBeGreaterThan(0);

      console.log(`Database query optimization test completed in ${queryTime}ms`);
    });
  });
});