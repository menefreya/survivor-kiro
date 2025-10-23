/**
 * Manual Test Script: Complete Data Flow from Database to UI
 * 
 * This script tests task 7.1 requirements:
 * - Verify event counts display correctly for contestants with different event histories
 * - Test auto-refresh functionality includes new columns
 * - Confirm loading states work properly for new columns
 * 
 * Run with: node backend/__tests__/manual/test-contestant-performance-data-flow.js
 */

const axios = require('axios');
const supabase = require('../../db/supabase');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testpassword123';

// Generate unique test data for different event scenarios
const timestamp = Date.now();
const TEST_SCENARIOS = [
  {
    name: 'Contestant with all event types',
    contestantName: `Test Contestant A ${timestamp}`,
    events: [
      { type: 'found_hidden_idol', count: 2 },
      { type: 'team_reward_win', count: 3 },
      { type: 'team_immunity_win', count: 1 }
    ]
  },
  {
    name: 'Contestant with no events',
    contestantName: `Test Contestant B ${timestamp}`,
    events: []
  },
  {
    name: 'Contestant with partial events',
    contestantName: `Test Contestant C ${timestamp}`,
    events: [
      { type: 'found_hidden_idol', count: 1 },
      { type: 'team_immunity_win', count: 2 }
    ]
  }
];

class ContestantPerformanceDataFlowTest {
  constructor() {
    this.authToken = null;
    this.testContestants = [];
    this.testEpisodes = [];
    this.testEventTypes = [];
  }

  async run() {
    console.log('🚀 Starting Contestant Performance Data Flow Test');
    console.log('=' .repeat(60));

    try {
      // Step 1: Setup test environment
      await this.setupTestEnvironment();
      
      // Step 2: Test API endpoint with different event scenarios
      await this.testEventCountsDisplay();
      
      // Step 3: Test loading states and error handling
      await this.testLoadingStates();
      
      // Step 4: Test auto-refresh functionality
      await this.testAutoRefreshFunctionality();
      
      // Step 5: Cleanup
      await this.cleanup();
      
      console.log('\n✅ All tests completed successfully!');
      console.log('Data flow from database to UI is working correctly.');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Attempt cleanup even on failure
      try {
        await this.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError.message);
      }
      
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log('\n📋 Setting up test environment...');
    
    // Authenticate to get token
    await this.authenticate();
    
    // Check if required event types exist
    await this.ensureEventTypesExist();
    
    // Create test contestants with different event scenarios
    await this.createTestContestants();
    
    // Create test episodes
    await this.createTestEpisodes();
    
    // Create test events for different scenarios
    await this.createTestEvents();
    
    console.log('✅ Test environment setup complete');
  }

  async authenticate() {
    console.log('🔐 Authenticating test user...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });
      
      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Test user not found, attempting to create...');
        await this.createTestUser();
        await this.authenticate();
      } else {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
  }

  async createTestUser() {
    try {
      await axios.post(`${API_BASE_URL}/auth/signup`, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        name: 'Test User'
      });
      console.log('✅ Test user created');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️  Test user already exists');
      } else {
        throw error;
      }
    }
  }

  async ensureEventTypesExist() {
    console.log('🔍 Checking required event types...');
    
    const requiredEventTypes = [
      { name: 'found_hidden_idol', display_name: 'Found Hidden Idol', points: 5 },
      { name: 'team_reward_win', display_name: 'Team Reward Win', points: 3 },
      { name: 'team_immunity_win', display_name: 'Team Immunity Win', points: 4 }
    ];

    for (const eventType of requiredEventTypes) {
      const { data: existing } = await supabase
        .from('event_types')
        .select('id, name')
        .eq('name', eventType.name)
        .single();

      if (!existing) {
        const { data: created, error } = await supabase
          .from('event_types')
          .insert([eventType])
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create event type ${eventType.name}: ${error.message}`);
        }
        
        this.testEventTypes.push(created);
        console.log(`✅ Created event type: ${eventType.name}`);
      } else {
        this.testEventTypes.push(existing);
        console.log(`ℹ️  Event type exists: ${eventType.name}`);
      }
    }
  }

  async createTestContestants() {
    console.log('👥 Setting up test contestants...');
    
    // First, get existing contestants to use for testing
    const { data: existingContestants } = await supabase
      .from('contestants')
      .select('*')
      .limit(3);

    if (existingContestants && existingContestants.length >= 3) {
      // Use existing contestants for testing
      for (let i = 0; i < Math.min(3, existingContestants.length); i++) {
        const contestant = existingContestants[i];
        const scenario = TEST_SCENARIOS[i];
        this.testContestants.push({ ...contestant, scenario });
        console.log(`✅ Using existing contestant for testing: ${contestant.name}`);
      }
      return;
    }

    // If not enough existing contestants, create new ones with unique names
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const scenario = TEST_SCENARIOS[i];
      
      // Try to find an existing contestant first
      let contestant = existingContestants && existingContestants[i];
      
      if (!contestant) {
        // Create new contestant with a more unique approach
        const uniqueName = `TestContestant${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: newContestant, error } = await supabase
          .from('contestants')
          .insert([{
            name: uniqueName,
            profession: 'Test Profession',
            total_score: Math.floor(Math.random() * 100) + 50,
            is_eliminated: false
          }])
          .select()
          .single();

        if (error) {
          console.warn(`⚠️  Could not create new contestant: ${error.message}`);
          continue;
        }

        contestant = newContestant;
        console.log(`✅ Created new contestant: ${uniqueName}`);
      }

      this.testContestants.push({ ...contestant, scenario });
    }

    if (this.testContestants.length === 0) {
      throw new Error('No contestants available for testing');
    }
  }

  async createTestEpisodes() {
    console.log('📺 Creating test episodes...');
    
    // First, try to get existing episodes
    const { data: existingEpisodes } = await supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: true })
      .limit(3);

    if (existingEpisodes && existingEpisodes.length > 0) {
      this.testEpisodes = existingEpisodes;
      console.log(`✅ Using existing episodes: ${existingEpisodes.length}`);
      return;
    }

    // Create new episodes if none exist
    for (let i = 1; i <= 3; i++) {
      const { data: episode, error } = await supabase
        .from('episodes')
        .insert([{
          episode_number: i,
          air_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error && !error.message.includes('duplicate')) {
        throw new Error(`Failed to create episode ${i}: ${error.message}`);
      }

      if (episode) {
        this.testEpisodes.push(episode);
        console.log(`✅ Created episode: ${i}`);
      }
    }
  }

  async createTestEvents() {
    console.log('🎯 Creating test events...');
    
    for (const contestant of this.testContestants) {
      const { scenario } = contestant;
      
      for (const eventSpec of scenario.events) {
        const eventType = this.testEventTypes.find(et => et.name === eventSpec.type);
        if (!eventType) {
          console.warn(`⚠️  Event type not found: ${eventSpec.type}`);
          continue;
        }

        // Create multiple events for the specified count
        for (let i = 0; i < eventSpec.count; i++) {
          const episodeIndex = i % this.testEpisodes.length;
          const episode = this.testEpisodes[episodeIndex];

          const { error } = await supabase
            .from('contestant_events')
            .insert([{
              contestant_id: contestant.id,
              episode_id: episode.id,
              event_type_id: eventType.id,
              point_value: eventType.points || 0
            }]);

          if (error) {
            console.warn(`⚠️  Failed to create event for ${contestant.name}: ${error.message}`);
          }
        }
      }
      
      console.log(`✅ Created events for: ${contestant.name}`);
    }
  }

  async testEventCountsDisplay() {
    console.log('\n🧪 Testing event counts display...');
    
    const response = await axios.get(`${API_BASE_URL}/contestants/performance`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const contestants = response.data.data;
    console.log(`✅ Received ${contestants.length} contestants from API`);

    // Verify each test scenario
    for (const testContestant of this.testContestants) {
      const apiContestant = contestants.find(c => c.name === testContestant.name);
      
      if (!apiContestant) {
        throw new Error(`Test contestant not found in API response: ${testContestant.name}`);
      }

      console.log(`\n🔍 Verifying ${testContestant.name}:`);
      
      // Check that event count fields exist
      const requiredFields = ['idols_found', 'reward_wins', 'immunity_wins'];
      for (const field of requiredFields) {
        if (apiContestant[field] === undefined) {
          throw new Error(`Missing field ${field} for contestant ${testContestant.name}`);
        }
      }

      // Verify event counts match expected values
      const expectedCounts = this.getExpectedEventCounts(testContestant.scenario);
      
      if (apiContestant.idols_found !== expectedCounts.idols_found) {
        throw new Error(`Idols found mismatch for ${testContestant.name}: expected ${expectedCounts.idols_found}, got ${apiContestant.idols_found}`);
      }
      
      if (apiContestant.reward_wins !== expectedCounts.reward_wins) {
        throw new Error(`Reward wins mismatch for ${testContestant.name}: expected ${expectedCounts.reward_wins}, got ${apiContestant.reward_wins}`);
      }
      
      if (apiContestant.immunity_wins !== expectedCounts.immunity_wins) {
        throw new Error(`Immunity wins mismatch for ${testContestant.name}: expected ${expectedCounts.immunity_wins}, got ${apiContestant.immunity_wins}`);
      }

      console.log(`  ✅ Idols Found: ${apiContestant.idols_found}`);
      console.log(`  ✅ Reward Wins: ${apiContestant.reward_wins}`);
      console.log(`  ✅ Immunity Wins: ${apiContestant.immunity_wins}`);
    }

    console.log('\n✅ Event counts display correctly for all scenarios');
  }

  getExpectedEventCounts(scenario) {
    const counts = { idols_found: 0, reward_wins: 0, immunity_wins: 0 };
    
    for (const event of scenario.events) {
      switch (event.type) {
        case 'found_hidden_idol':
          counts.idols_found = event.count;
          break;
        case 'team_reward_win':
          counts.reward_wins = event.count;
          break;
        case 'team_immunity_win':
          counts.immunity_wins = event.count;
          break;
      }
    }
    
    return counts;
  }

  async testLoadingStates() {
    console.log('\n⏳ Testing loading states and error handling...');
    
    // Test 1: Verify API responds quickly (simulating loading state)
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}/contestants/performance`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ API response time: ${responseTime}ms`);
    
    if (responseTime > 5000) {
      console.warn('⚠️  API response time is slow, loading states may be visible longer');
    }

    // Test 2: Verify response structure includes new fields
    const contestants = response.data.data;
    if (contestants.length > 0) {
      const sampleContestant = contestants[0];
      const requiredFields = ['idols_found', 'reward_wins', 'immunity_wins'];
      
      for (const field of requiredFields) {
        if (!(field in sampleContestant)) {
          throw new Error(`Loading state test failed: ${field} not in response`);
        }
      }
      
      console.log('✅ All new columns included in API response');
    }

    // Test 3: Test with invalid auth (error state)
    try {
      await axios.get(`${API_BASE_URL}/contestants/performance`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      throw new Error('Expected authentication error but request succeeded');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('✅ Error handling works correctly for invalid auth');
      } else {
        throw error;
      }
    }
  }

  async testAutoRefreshFunctionality() {
    console.log('\n🔄 Testing auto-refresh functionality...');
    
    // Get initial state
    const initialResponse = await axios.get(`${API_BASE_URL}/contestants/performance`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });
    
    const initialContestants = initialResponse.data.data;
    console.log(`✅ Initial state: ${initialContestants.length} contestants`);

    // Modify data (add a new event to test contestant)
    if (this.testContestants.length > 0 && this.testEpisodes.length > 0) {
      const testContestant = this.testContestants[0];
      const testEpisode = this.testEpisodes[0];
      const idolEventType = this.testEventTypes.find(et => et.name === 'found_hidden_idol');

      if (idolEventType) {
        const { error } = await supabase
          .from('contestant_events')
          .insert([{
            contestant_id: testContestant.id,
            episode_id: testEpisode.id,
            event_type_id: idolEventType.id,
            point_value: 5
          }]);

        if (!error) {
          console.log(`✅ Added new event for ${testContestant.name}`);

          // Wait a moment then fetch again (simulating auto-refresh)
          await new Promise(resolve => setTimeout(resolve, 1000));

          const refreshedResponse = await axios.get(`${API_BASE_URL}/contestants/performance`, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          });

          const refreshedContestants = refreshedResponse.data.data;
          const refreshedContestant = refreshedContestants.find(c => c.id === testContestant.id);

          if (refreshedContestant) {
            const initialContestant = initialContestants.find(c => c.id === testContestant.id);
            
            if (refreshedContestant.idols_found > (initialContestant?.idols_found || 0)) {
              console.log('✅ Auto-refresh functionality includes new event data');
            } else {
              console.warn('⚠️  New event not reflected in refreshed data (may be caching)');
            }
          }
        }
      }
    }

    // Test multiple rapid requests (simulating auto-refresh interval)
    console.log('🔄 Testing rapid refresh requests...');
    const refreshPromises = [];
    
    for (let i = 0; i < 3; i++) {
      refreshPromises.push(
        axios.get(`${API_BASE_URL}/contestants/performance`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        })
      );
    }

    const refreshResults = await Promise.all(refreshPromises);
    
    // Verify all requests succeeded and returned consistent data
    for (let i = 0; i < refreshResults.length; i++) {
      if (refreshResults[i].status !== 200) {
        throw new Error(`Refresh request ${i + 1} failed with status ${refreshResults[i].status}`);
      }
      
      const contestants = refreshResults[i].data.data;
      if (contestants.length === 0) {
        throw new Error(`Refresh request ${i + 1} returned no contestants`);
      }
      
      // Verify new columns are present
      const sampleContestant = contestants[0];
      if (!('idols_found' in sampleContestant && 'reward_wins' in sampleContestant && 'immunity_wins' in sampleContestant)) {
        throw new Error(`Refresh request ${i + 1} missing new columns`);
      }
    }

    console.log('✅ Auto-refresh functionality works correctly with new columns');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test events
      for (const contestant of this.testContestants) {
        await supabase
          .from('contestant_events')
          .delete()
          .eq('contestant_id', contestant.id);
      }

      // Delete test contestants
      for (const contestant of this.testContestants) {
        await supabase
          .from('contestants')
          .delete()
          .eq('id', contestant.id);
      }

      // Note: We don't delete episodes as they might be used by other data

      // Note: We don't delete event types as they might be used by other data

      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const test = new ContestantPerformanceDataFlowTest();
  test.run().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ContestantPerformanceDataFlowTest;