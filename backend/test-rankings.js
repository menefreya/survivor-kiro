/**
 * Test script for ranking endpoints
 * Tests POST /api/rankings and GET /api/rankings/:playerId
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (you may need to adjust these)
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

let authToken = '';
let playerId = '';

async function signup() {
  try {
    console.log('\n1. Testing signup...');
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, testUser);
    console.log('✓ Signup successful');
    return response.data;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('✓ User already exists, will use login');
      return null;
    }
    console.error('✗ Signup failed:', error.response?.data || error.message);
    throw error;
  }
}

async function login() {
  try {
    console.log('\n2. Testing login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = response.data.token;
    playerId = response.data.user.id;
    console.log('✓ Login successful');
    console.log(`  Token: ${authToken.substring(0, 20)}...`);
    console.log(`  Player ID: ${playerId}`);
    return response.data;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getContestants() {
  try {
    console.log('\n3. Fetching contestants...');
    const response = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✓ Fetched ${response.data.length} contestants`);
    return response.data;
  } catch (error) {
    console.error('✗ Failed to fetch contestants:', error.response?.data || error.message);
    throw error;
  }
}

async function submitRankings(contestants) {
  try {
    console.log('\n4. Testing POST /api/rankings (submit rankings)...');
    
    // Create rankings array with all contestants
    const rankings = contestants.map((contestant, index) => ({
      contestant_id: contestant.id,
      rank: index + 1
    }));

    // Pick first contestant as sole survivor
    const sole_survivor_id = contestants[0].id;

    const response = await axios.post(
      `${API_BASE_URL}/rankings`,
      {
        rankings: rankings,
        sole_survivor_id: sole_survivor_id
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('✓ Rankings submitted successfully');
    console.log(`  Rankings count: ${response.data.rankings_count}`);
    console.log(`  Sole survivor ID: ${response.data.sole_survivor_id}`);
    return response.data;
  } catch (error) {
    console.error('✗ Failed to submit rankings:', error.response?.data || error.message);
    throw error;
  }
}

async function getRankings() {
  try {
    console.log('\n5. Testing GET /api/rankings/:playerId (fetch rankings)...');
    const response = await axios.get(`${API_BASE_URL}/rankings/${playerId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✓ Rankings fetched successfully');
    console.log(`  Player: ${response.data.player_name}`);
    console.log(`  Has submitted: ${response.data.has_submitted_rankings}`);
    console.log(`  Rankings count: ${response.data.rankings.length}`);
    console.log(`  Sole survivor: ${response.data.sole_survivor?.name || 'None'}`);
    
    // Display first 3 rankings
    console.log('\n  Top 3 rankings:');
    response.data.rankings.slice(0, 3).forEach(ranking => {
      console.log(`    ${ranking.rank}. ${ranking.contestants.name} (${ranking.contestants.profession})`);
    });

    return response.data;
  } catch (error) {
    console.error('✗ Failed to fetch rankings:', error.response?.data || error.message);
    throw error;
  }
}

async function testValidation() {
  try {
    console.log('\n6. Testing validation (incomplete rankings)...');
    const response = await axios.post(
      `${API_BASE_URL}/rankings`,
      {
        rankings: [{ contestant_id: 1, rank: 1 }], // Only one contestant
        sole_survivor_id: 1
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✗ Validation should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Validation correctly rejected incomplete rankings');
      console.log(`  Error: ${error.response.data.error}`);
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testDuplicateSubmission() {
  try {
    console.log('\n7. Testing duplicate submission prevention...');
    const contestants = await getContestants();
    const rankings = contestants.map((contestant, index) => ({
      contestant_id: contestant.id,
      rank: index + 1
    }));

    const response = await axios.post(
      `${API_BASE_URL}/rankings`,
      {
        rankings: rankings,
        sole_survivor_id: contestants[0].id
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✗ Should have prevented duplicate submission');
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.error.includes('already submitted')) {
      console.log('✓ Correctly prevented duplicate submission');
      console.log(`  Error: ${error.response.data.error}`);
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function runTests() {
  try {
    console.log('='.repeat(60));
    console.log('RANKING ENDPOINTS TEST SUITE');
    console.log('='.repeat(60));

    await signup();
    await login();
    const contestants = await getContestants();
    
    if (contestants.length === 0) {
      console.log('\n⚠ No contestants found. Please add contestants first.');
      console.log('  You can use the test-contestants.js script to add test data.');
      return;
    }

    await submitRankings(contestants);
    await getRankings();
    await testValidation();
    await testDuplicateSubmission();

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
