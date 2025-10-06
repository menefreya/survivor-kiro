const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Store tokens for testing
let authToken = '';
let testPlayerId = '';
let secondPlayerId = '';

// Test data
const testUser = {
  email: `testplayer${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Test Player',
  profile_image_url: 'https://example.com/avatar.jpg'
};

const secondUser = {
  email: `testplayer2${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Second Player'
};

/**
 * Test script for player endpoints
 * Run this after starting the server with: node test-players.js
 */

async function testPlayerEndpoints() {
  console.log('🧪 Testing Player API Endpoints\n');
  console.log('Make sure the server is running on port 3001\n');

  try {
    // Step 1: Create test user
    console.log('1️⃣  Creating test user...');
    const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, testUser);
    
    authToken = signupResponse.data.token;
    testPlayerId = signupResponse.data.user.id;
    console.log('✅ Test user created');
    console.log(`   User ID: ${testPlayerId}\n`);

    // Step 1b: Create second user for testing
    console.log('1️⃣b Creating second test user...');
    const secondSignupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, secondUser);
    secondPlayerId = secondSignupResponse.data.user.id;
    console.log('✅ Second test user created');
    console.log(`   User ID: ${secondPlayerId}\n`);

    // Step 2: Get all players
    console.log('2️⃣  Getting all players...');
    const allPlayersResponse = await axios.get(`${API_BASE_URL}/players`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Fetched all players');
    console.log(`   Total players: ${allPlayersResponse.data.players.length}`);
    console.log(`   Players: ${allPlayersResponse.data.players.map(p => p.name).join(', ')}\n`);

    // Step 3: Get specific player by ID
    console.log('3️⃣  Getting player by ID...');
    const playerResponse = await axios.get(`${API_BASE_URL}/players/${testPlayerId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Fetched player details');
    console.log(`   Name: ${playerResponse.data.player.name}`);
    console.log(`   Email: ${playerResponse.data.player.email}`);
    console.log(`   Profile Image: ${playerResponse.data.player.profile_image_url || 'None'}\n`);

    // Step 4: Update player profile image
    console.log('4️⃣  Updating player profile image...');
    const updateResponse = await axios.put(
      `${API_BASE_URL}/players/${testPlayerId}`,
      { profile_image_url: 'https://example.com/new-profile.jpg' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ Profile updated successfully');
    console.log(`   New profile image: ${updateResponse.data.player.profile_image_url}\n`);

    // Step 5: Verify update by fetching player again
    console.log('5️⃣  Verifying profile update...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/players/${testPlayerId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Profile update verified');
    console.log(`   Current profile image: ${verifyResponse.data.player.profile_image_url}\n`);

    // Step 6: Test unauthorized access (no token)
    console.log('6️⃣  Testing unauthorized access...');
    try {
      await axios.get(`${API_BASE_URL}/players`);
      console.log('❌ Should have failed without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected request without token\n');
      } else {
        throw error;
      }
    }

    // Step 7: Test updating another user's profile (should fail)
    console.log('7️⃣  Testing unauthorized profile update...');
    try {
      await axios.put(
        `${API_BASE_URL}/players/${secondPlayerId}`,
        { profile_image_url: 'https://example.com/hack.jpg' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log('❌ Should have failed when updating another user\'s profile');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Correctly rejected unauthorized profile update\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 All player endpoint tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run tests
testPlayerEndpoints().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
