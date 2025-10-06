const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (use existing test users)
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
    authToken = response.data.token;
    console.log('✓ Login successful\n');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetLeaderboard() {
  try {
    console.log('Testing GET /api/leaderboard...');
    const response = await axios.get(`${API_BASE_URL}/leaderboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✓ Leaderboard fetched successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (Array.isArray(response.data)) {
      console.log(`✓ Leaderboard contains ${response.data.length} players`);
      
      if (response.data.length > 0) {
        const firstPlayer = response.data[0];
        console.log('\nFirst player structure:');
        console.log('- player_id:', firstPlayer.player_id);
        console.log('- player_name:', firstPlayer.player_name);
        console.log('- profile_image_url:', firstPlayer.profile_image_url);
        console.log('- total_score:', firstPlayer.total_score);
        console.log('- drafted_contestants:', firstPlayer.drafted_contestants?.length || 0);
        console.log('- sole_survivor:', firstPlayer.sole_survivor ? 'Yes' : 'No');
        
        // Verify sorting (descending by score)
        let isSorted = true;
        for (let i = 0; i < response.data.length - 1; i++) {
          const current = response.data[i];
          const next = response.data[i + 1];
          
          if (current.total_score < next.total_score) {
            isSorted = false;
            break;
          }
          
          // Check alphabetical sorting for ties
          if (current.total_score === next.total_score) {
            if (current.player_name > next.player_name) {
              isSorted = false;
              break;
            }
          }
        }
        
        if (isSorted) {
          console.log('✓ Leaderboard is correctly sorted by score (desc) and name (asc) for ties');
        } else {
          console.log('✗ Leaderboard sorting is incorrect');
        }
      }
    } else {
      console.log('✗ Response is not an array');
    }
    
    console.log();
    return true;
  } catch (error) {
    console.error('✗ Get leaderboard failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLeaderboardWithoutAuth() {
  try {
    console.log('Testing GET /api/leaderboard without authentication...');
    await axios.get(`${API_BASE_URL}/leaderboard`);
    console.log('✗ Should have required authentication\n');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly requires authentication\n');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Leaderboard API Tests ===\n');
  
  // Test without authentication
  await testLeaderboardWithoutAuth();
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('Cannot proceed without login');
    return;
  }
  
  // Test leaderboard endpoint
  await testGetLeaderboard();
  
  console.log('=== Tests Complete ===');
}

runTests();
