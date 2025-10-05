const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (use existing test account)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

let authToken = null;
let testContestantId = null;

/**
 * Login to get auth token
 */
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    console.log('✓ Login successful\n');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get a contestant ID to test with
 */
async function getTestContestant() {
  try {
    console.log('Fetching contestants...');
    const response = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data && response.data.length > 0) {
      testContestantId = response.data[0].id;
      console.log(`✓ Using contestant: ${response.data[0].name} (ID: ${testContestantId})\n`);
      return true;
    } else {
      console.log('✗ No contestants found\n');
      return false;
    }
  } catch (error) {
    console.error('✗ Failed to fetch contestants:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test GET /api/contestants/:id/events
 */
async function testGetContestantEvents() {
  try {
    console.log(`Testing GET /api/contestants/${testContestantId}/events...`);
    const response = await axios.get(
      `${API_BASE_URL}/contestants/${testContestantId}/events`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✓ Successfully fetched contestant events');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log(`  - Contestant: ${response.data.contestant.name}`);
    console.log(`  - Total events: ${response.data.events.length}`);
    
    if (response.data.events.length > 0) {
      console.log('  - Sample event:');
      const event = response.data.events[0];
      console.log(`    - Episode ${event.episode_number}: ${event.event_display_name} (${event.points} pts)`);
      console.log(`    - Created: ${event.created_at}`);
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('✗ Failed to fetch contestant events:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test with invalid contestant ID
 */
async function testInvalidContestant() {
  try {
    console.log('Testing with invalid contestant ID...');
    await axios.get(
      `${API_BASE_URL}/contestants/99999/events`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✗ Should have returned 404 error\n');
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✓ Correctly returned 404 for invalid contestant\n');
      return true;
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Testing Contestant Events Endpoint ===\n');
  
  // Login
  if (!await login()) {
    console.log('Cannot proceed without authentication');
    return;
  }
  
  // Get test contestant
  if (!await getTestContestant()) {
    console.log('Cannot proceed without test contestant');
    return;
  }
  
  // Run tests
  const results = [];
  results.push(await testGetContestantEvents());
  results.push(await testInvalidContestant());
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✓ All tests passed!');
  } else {
    console.log('✗ Some tests failed');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
