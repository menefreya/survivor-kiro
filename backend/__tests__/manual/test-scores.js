const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (you'll need to use actual credentials from your database)
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'password123';
const PLAYER_EMAIL = 'player@test.com';
const PLAYER_PASSWORD = 'password123';

let adminToken = '';
let playerToken = '';

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testAddEpisodeScores() {
  console.log('\n=== Testing Add Episode Scores (Admin Only) ===');
  
  try {
    // First, get all contestants to use their IDs
    const contestantsResponse = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const contestants = contestantsResponse.data;
    console.log(`Found ${contestants.length} contestants`);
    
    if (contestants.length === 0) {
      console.log('No contestants found. Please add contestants first.');
      return;
    }

    // Prepare scores for all contestants
    const scores = contestants.map(contestant => ({
      contestant_id: contestant.id,
      score: Math.floor(Math.random() * 10) + 1 // Random score between 1-10
    }));

    const response = await axios.post(
      `${API_BASE_URL}/scores`,
      {
        episode_number: 1,
        scores: scores
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.log('✓ Episode scores added successfully');
    console.log('Episode:', response.data.episode);
    console.log(`Added ${response.data.scores.length} scores`);
  } catch (error) {
    console.error('✗ Failed to add episode scores:', error.response?.data || error.message);
  }
}

async function testAddEpisodeScoresValidation() {
  console.log('\n=== Testing Add Episode Scores Validation ===');
  
  // Test missing episode number
  try {
    await axios.post(
      `${API_BASE_URL}/scores`,
      {
        scores: [{ contestant_id: 1, score: 5 }]
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log('✗ Should have failed with missing episode number');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected missing episode number');
    }
  }

  // Test invalid episode number
  try {
    await axios.post(
      `${API_BASE_URL}/scores`,
      {
        episode_number: -1,
        scores: [{ contestant_id: 1, score: 5 }]
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log('✗ Should have failed with invalid episode number');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected invalid episode number');
    }
  }

  // Test duplicate episode
  try {
    const contestantsResponse = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const contestants = contestantsResponse.data;
    if (contestants.length > 0) {
      const scores = contestants.map(c => ({
        contestant_id: c.id,
        score: 5
      }));

      await axios.post(
        `${API_BASE_URL}/scores`,
        {
          episode_number: 1,
          scores: scores
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      console.log('✗ Should have failed with duplicate episode');
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.error.includes('already been added')) {
      console.log('✓ Correctly rejected duplicate episode');
    }
  }
}

async function testGetContestantScores() {
  console.log('\n=== Testing Get Contestant Scores ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/scores/contestants`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    
    console.log('✓ Retrieved contestant scores successfully');
    console.log(`Found ${response.data.length} contestants with scores`);
    
    if (response.data.length > 0) {
      console.log('\nTop 3 contestants:');
      response.data.slice(0, 3).forEach((contestant, index) => {
        console.log(`${index + 1}. ${contestant.name}: ${contestant.total_score} points`);
      });
    }
  } catch (error) {
    console.error('✗ Failed to get contestant scores:', error.response?.data || error.message);
  }
}

async function testPlayerCannotAddScores() {
  console.log('\n=== Testing Player Cannot Add Scores (Admin Only) ===');
  
  try {
    await axios.post(
      `${API_BASE_URL}/scores`,
      {
        episode_number: 99,
        scores: [{ contestant_id: 1, score: 5 }]
      },
      {
        headers: { Authorization: `Bearer ${playerToken}` }
      }
    );
    console.log('✗ Player should not be able to add scores');
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✓ Correctly rejected non-admin user');
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testUnauthenticatedAccess() {
  console.log('\n=== Testing Unauthenticated Access ===');
  
  try {
    await axios.get(`${API_BASE_URL}/scores/contestants`);
    console.log('✗ Should require authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly requires authentication for GET /scores/contestants');
    }
  }

  try {
    await axios.post(`${API_BASE_URL}/scores`, {
      episode_number: 1,
      scores: []
    });
    console.log('✗ Should require authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly requires authentication for POST /scores');
    }
  }
}

async function runTests() {
  console.log('Starting Score Management API Tests...\n');
  
  try {
    // Login as admin
    console.log('Logging in as admin...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Admin login successful');

    // Login as player
    console.log('Logging in as player...');
    playerToken = await login(PLAYER_EMAIL, PLAYER_PASSWORD);
    console.log('✓ Player login successful');

    // Run tests
    await testUnauthenticatedAccess();
    await testPlayerCannotAddScores();
    await testAddEpisodeScores();
    await testAddEpisodeScoresValidation();
    await testGetContestantScores();

    console.log('\n=== All Tests Complete ===');
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

// Run tests
runTests();
