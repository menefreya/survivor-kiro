/**
 * Test script for sole survivor history tracking endpoints
 * 
 * Tests:
 * 1. POST /api/players/:playerId/sole-survivor - Update sole survivor
 * 2. GET /api/players/:playerId/sole-survivor-history - Get history
 * 3. Multiple changes to verify history tracking
 * 
 * Run with: node backend/test-sole-survivor-history.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

let authToken = '';
let testPlayerId = null;
let testContestantIds = [];

// Helper function to make authenticated requests
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function login() {
  console.log('\n1. Logging in as test player...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    authToken = response.data.token;
    testPlayerId = response.data.player.id;
    console.log(`✓ Logged in successfully (Player ID: ${testPlayerId})`);
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    console.log('\nNote: Make sure you have a test player with email "test@example.com" and password "password123"');
    return false;
  }
}

async function getContestants() {
  console.log('\n2. Fetching contestants...');
  try {
    const response = await api.get('/contestants');
    const contestants = response.data.contestants || response.data;
    
    if (contestants.length < 2) {
      console.error('✗ Need at least 2 contestants for testing');
      return false;
    }
    
    testContestantIds = contestants.slice(0, 3).map(c => c.id);
    console.log(`✓ Found ${contestants.length} contestants`);
    console.log(`  Using contestant IDs: ${testContestantIds.join(', ')}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to fetch contestants:', error.response?.data || error.message);
    return false;
  }
}

async function updateSoleSurvivor(contestantId, description) {
  console.log(`\n${description}`);
  try {
    const response = await api.post(`/players/${testPlayerId}/sole-survivor`, {
      contestant_id: contestantId
    });
    
    console.log(`✓ Updated sole survivor to contestant ${contestantId}`);
    console.log(`  Current episode: ${response.data.current_episode}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to update sole survivor:', error.response?.data || error.message);
    return false;
  }
}

async function getSoleSurvivorHistory() {
  console.log('\n6. Fetching sole survivor history...');
  try {
    const response = await api.get(`/players/${testPlayerId}/sole-survivor-history`);
    const history = response.data.history;
    
    console.log(`✓ Retrieved ${history.length} history record(s):`);
    console.log('─'.repeat(80));
    
    history.forEach((record, index) => {
      const contestant = record.contestants;
      const endEpisode = record.end_episode ? `Episode ${record.end_episode}` : 'Current';
      console.log(`${index + 1}. Contestant: ${contestant.name} (ID: ${contestant.id})`);
      console.log(`   Episodes: ${record.start_episode} - ${endEpisode}`);
      console.log(`   Selected: ${new Date(record.created_at).toLocaleString()}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    
    return true;
  } catch (error) {
    console.error('✗ Failed to fetch history:', error.response?.data || error.message);
    return false;
  }
}

async function testDuplicateUpdate() {
  console.log('\n7. Testing duplicate update (same contestant)...');
  try {
    const response = await api.post(`/players/${testPlayerId}/sole-survivor`, {
      contestant_id: testContestantIds[2]
    });
    
    console.log(`✓ ${response.data.message}`);
    return true;
  } catch (error) {
    console.error('✗ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidContestant() {
  console.log('\n8. Testing invalid contestant ID...');
  try {
    await api.post(`/players/${testPlayerId}/sole-survivor`, {
      contestant_id: 99999
    });
    
    console.error('✗ Should have failed with 404');
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✓ Correctly rejected invalid contestant ID');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testMissingContestantId() {
  console.log('\n9. Testing missing contestant_id...');
  try {
    await api.post(`/players/${testPlayerId}/sole-survivor`, {});
    
    console.error('✗ Should have failed with 400');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected missing contestant_id');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('═'.repeat(80));
  console.log('SOLE SURVIVOR HISTORY TRACKING - TEST SUITE');
  console.log('═'.repeat(80));

  // Setup
  if (!await login()) return;
  if (!await getContestants()) return;

  // Test updating sole survivor multiple times
  await updateSoleSurvivor(testContestantIds[0], '3. Setting initial sole survivor...');
  await updateSoleSurvivor(testContestantIds[1], '4. Changing sole survivor...');
  await updateSoleSurvivor(testContestantIds[2], '5. Changing sole survivor again...');

  // Test fetching history
  await getSoleSurvivorHistory();

  // Test edge cases
  await testDuplicateUpdate();
  await testInvalidContestant();
  await testMissingContestantId();

  console.log('\n═'.repeat(80));
  console.log('TEST SUITE COMPLETE');
  console.log('═'.repeat(80));
  console.log('\nNote: History records show selections in reverse chronological order.');
  console.log('The most recent selection should have end_episode = NULL (current).\n');
}

// Run tests
runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
