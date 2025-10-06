const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (use existing test user or create one)
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';
let playerId = '';

async function login() {
  try {
    console.log('\n=== Testing Login ===');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.token;
    playerId = response.data.user.id;
    console.log('✓ Login successful');
    console.log('Player ID:', playerId);
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getContestants() {
  try {
    console.log('\n=== Getting Contestants ===');
    const response = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ Fetched contestants:', response.data.contestants.length);
    return response.data.contestants;
  } catch (error) {
    console.error('✗ Failed to get contestants:', error.response?.data || error.message);
    return [];
  }
}

async function updateSoleSurvivor(contestantId) {
  try {
    console.log('\n=== Updating Sole Survivor Pick ===');
    console.log('Setting contestant ID:', contestantId);
    const response = await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      { contestant_id: contestantId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✓ Sole survivor updated successfully');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('✗ Failed to update sole survivor:', error.response?.data || error.message);
    return false;
  }
}

async function updateSoleSurvivorWithoutAuth(contestantId) {
  try {
    console.log('\n=== Testing Without Authentication ===');
    await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      { contestant_id: contestantId }
    );
    console.error('✗ Should have failed without auth token');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly rejected request without auth token');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function updateSoleSurvivorInvalidContestant() {
  try {
    console.log('\n=== Testing Invalid Contestant ID ===');
    await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      { contestant_id: 99999 },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.error('✗ Should have failed with invalid contestant ID');
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

async function updateSoleSurvivorMissingData() {
  try {
    console.log('\n=== Testing Missing Contestant ID ===');
    await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.error('✗ Should have failed without contestant_id');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected request without contestant_id');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function getPlayerDetails() {
  try {
    console.log('\n=== Verifying Player Details ===');
    const response = await axios.get(`${API_BASE_URL}/players/${playerId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ Player details retrieved');
    console.log('Sole Survivor ID:', response.data.player.sole_survivor_id);
    return response.data.player;
  } catch (error) {
    console.error('✗ Failed to get player details:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('=================================');
  console.log('Sole Survivor API Tests');
  console.log('=================================');
  console.log('Make sure the server is running on port 3001');

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without login');
    return;
  }

  // Get contestants
  const contestants = await getContestants();
  if (contestants.length === 0) {
    console.log('\n❌ No contestants available for testing');
    return;
  }

  const testContestantId = contestants[0].id;
  console.log('\nUsing test contestant ID:', testContestantId);

  // Run tests
  await updateSoleSurvivorWithoutAuth(testContestantId);
  await updateSoleSurvivorMissingData();
  await updateSoleSurvivorInvalidContestant();
  await updateSoleSurvivor(testContestantId);
  await getPlayerDetails();

  // Test updating to a different contestant
  if (contestants.length > 1) {
    const secondContestantId = contestants[1].id;
    console.log('\n=== Testing Update to Different Contestant ===');
    await updateSoleSurvivor(secondContestantId);
    await getPlayerDetails();
  }

  console.log('\n=================================');
  console.log('Tests Complete');
  console.log('=================================');
}

runTests();
