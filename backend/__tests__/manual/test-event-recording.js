/**
 * Test script for Event Recording API endpoints
 * Tests GET, POST, DELETE, and bulk update operations
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

let authToken = '';
let testEpisodeId = null;
let testContestantId = null;
let testEventTypeId = null;
let createdEventId = null;

/**
 * Login as admin to get auth token
 */
async function loginAsAdmin() {
  console.log('\n=== Logging in as admin ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    authToken = response.data.token;
    console.log('✓ Admin login successful');
    return true;
  } catch (error) {
    console.error('✗ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get test data (episode, contestant, event type)
 */
async function getTestData() {
  console.log('\n=== Getting test data ===');
  
  try {
    // Get first episode
    const episodesResponse = await axios.get(`${API_BASE_URL}/scores/episodes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (episodesResponse.data.length > 0) {
      testEpisodeId = episodesResponse.data[0].id;
      console.log(`✓ Using episode ID: ${testEpisodeId}`);
    } else {
      console.error('✗ No episodes found');
      return false;
    }

    // Get first contestant
    const contestantsResponse = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (contestantsResponse.data.length > 0) {
      testContestantId = contestantsResponse.data[0].id;
      console.log(`✓ Using contestant ID: ${testContestantId}`);
    } else {
      console.error('✗ No contestants found');
      return false;
    }

    // Get first event type
    const eventTypesResponse = await axios.get(`${API_BASE_URL}/event-types`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const allEventTypes = [
      ...eventTypesResponse.data.basic,
      ...eventTypesResponse.data.penalty,
      ...eventTypesResponse.data.bonus
    ];
    
    if (allEventTypes.length > 0) {
      testEventTypeId = allEventTypes[0].id;
      console.log(`✓ Using event type ID: ${testEventTypeId} (${allEventTypes[0].display_name})`);
    } else {
      console.error('✗ No event types found');
      return false;
    }

    return true;
  } catch (error) {
    console.error('✗ Failed to get test data:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test GET /api/episodes/:episodeId/events
 */
async function testGetEpisodeEvents() {
  console.log('\n=== Testing GET /api/episodes/:episodeId/events ===');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/episodes/${testEpisodeId}/events`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✓ GET episode events successful');
    console.log(`  Found ${response.data.length} contestants with events`);
    
    if (response.data.length > 0) {
      console.log(`  Sample: Contestant ${response.data[0].contestant_id} has ${response.data[0].events.length} events, score: ${response.data[0].episode_score}`);
    }
    
    return true;
  } catch (error) {
    console.error('✗ GET episode events failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test POST /api/episodes/:episodeId/events
 */
async function testAddEvents() {
  console.log('\n=== Testing POST /api/episodes/:episodeId/events ===');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/episodes/${testEpisodeId}/events`,
      {
        events: [
          {
            contestant_id: testContestantId,
            event_type_id: testEventTypeId
          }
        ]
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✓ POST add events successful');
    console.log(`  Added ${response.data.events.length} event(s)`);
    console.log(`  Updated scores for ${response.data.updated_scores.length} contestant(s)`);
    
    if (response.data.events.length > 0) {
      createdEventId = response.data.events[0].id;
      console.log(`  Created event ID: ${createdEventId}`);
    }
    
    return true;
  } catch (error) {
    console.error('✗ POST add events failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test POST /api/episodes/:episodeId/events/bulk
 */
async function testBulkUpdateEvents() {
  console.log('\n=== Testing POST /api/episodes/:episodeId/events/bulk ===');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/episodes/${testEpisodeId}/events/bulk`,
      {
        add: [
          {
            contestant_id: testContestantId,
            event_type_id: testEventTypeId
          }
        ],
        remove: []
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✓ POST bulk update events successful');
    console.log(`  Added: ${response.data.added}, Removed: ${response.data.removed}`);
    console.log(`  Updated scores for ${response.data.updated_scores.length} contestant(s)`);
    
    return true;
  } catch (error) {
    console.error('✗ POST bulk update events failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test DELETE /api/episodes/:episodeId/events/:eventId
 */
async function testDeleteEvent() {
  console.log('\n=== Testing DELETE /api/episodes/:episodeId/events/:eventId ===');
  
  if (!createdEventId) {
    console.log('⊘ Skipping delete test (no event ID available)');
    return true;
  }
  
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/episodes/${testEpisodeId}/events/${createdEventId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✓ DELETE event successful');
    console.log(`  Updated scores - Episode: ${response.data.updated_scores.episode_score}, Total: ${response.data.updated_scores.total_score}`);
    
    return true;
  } catch (error) {
    console.error('✗ DELETE event failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting Event Recording API Tests...');
  console.log('=====================================');

  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('\n❌ Tests aborted - login failed');
    return;
  }

  const testDataSuccess = await getTestData();
  if (!testDataSuccess) {
    console.log('\n❌ Tests aborted - could not get test data');
    return;
  }

  const results = {
    getEvents: await testGetEpisodeEvents(),
    addEvents: await testAddEvents(),
    bulkUpdate: await testBulkUpdateEvents(),
    deleteEvent: await testDeleteEvent()
  };

  console.log('\n=====================================');
  console.log('Test Results Summary:');
  console.log('=====================================');
  console.log(`GET episode events:    ${results.getEvents ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`POST add events:       ${results.addEvents ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`POST bulk update:      ${results.bulkUpdate ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`DELETE event:          ${results.deleteEvent ? '✓ PASS' : '✗ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  console.log('\n' + (allPassed ? '✓ All tests passed!' : '✗ Some tests failed'));
}

// Run tests
runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
