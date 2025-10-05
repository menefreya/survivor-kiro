/**
 * Test script for Score Breakdown API endpoint
 * Tests the GET /api/contestants/:id/score-breakdown endpoint
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test credentials (update with valid credentials)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful\n');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getContestants() {
  try {
    console.log('📋 Fetching contestants...');
    const response = await axios.get(`${API_BASE_URL}/api/contestants`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Found ${response.data.length} contestants\n`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch contestants:', error.response?.data || error.message);
    throw error;
  }
}

async function testScoreBreakdown(contestantId) {
  try {
    console.log(`\n📊 Testing score breakdown for contestant ${contestantId}...`);
    const response = await axios.get(
      `${API_BASE_URL}/api/contestants/${contestantId}/score-breakdown`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const breakdown = response.data;
    
    console.log('\n✅ Score Breakdown Retrieved:');
    console.log('─────────────────────────────────────');
    console.log(`Contestant: ${breakdown.contestant.name}`);
    console.log(`Total Score: ${breakdown.contestant.total_score} pts`);
    console.log(`Episodes: ${breakdown.episodes.length}`);
    
    if (breakdown.episodes.length > 0) {
      console.log('\nEpisode Details:');
      breakdown.episodes.forEach(episode => {
        console.log(`\n  Episode ${episode.episode_number}: ${episode.total} pts`);
        if (episode.events && episode.events.length > 0) {
          episode.events.forEach(event => {
            const sign = event.points > 0 ? '+' : '';
            console.log(`    - ${event.display_name}: ${sign}${event.points} pts`);
          });
        } else {
          console.log('    (No events recorded)');
        }
      });
    } else {
      console.log('\n  No episode data available');
    }
    
    console.log('\n─────────────────────────────────────\n');
    return breakdown;
  } catch (error) {
    console.error('❌ Failed to fetch score breakdown:', error.response?.data || error.message);
    throw error;
  }
}

async function testInvalidContestant() {
  try {
    console.log('\n🧪 Testing with invalid contestant ID...');
    await axios.get(
      `${API_BASE_URL}/api/contestants/99999/score-breakdown`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('❌ Should have returned 404 error');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Correctly returned 404 for invalid contestant\n');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testUnauthorized() {
  try {
    console.log('🧪 Testing without authentication...');
    await axios.get(`${API_BASE_URL}/api/contestants/1/score-breakdown`);
    console.log('❌ Should have returned 401 error');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly returned 401 for unauthorized request\n');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Score Breakdown API Tests\n');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // Test 1: Login
    await login();
    
    // Test 2: Get contestants
    const contestants = await getContestants();
    
    if (contestants.length === 0) {
      console.log('⚠️  No contestants found. Please add contestants first.');
      return;
    }
    
    // Test 3: Get score breakdown for first contestant
    await testScoreBreakdown(contestants[0].id);
    
    // Test 4: Get score breakdown for second contestant (if exists)
    if (contestants.length > 1) {
      await testScoreBreakdown(contestants[1].id);
    }
    
    // Test 5: Test with invalid contestant ID
    await testInvalidContestant();
    
    // Test 6: Test without authentication
    await testUnauthorized();
    
    console.log('═══════════════════════════════════════');
    console.log('✅ All tests completed successfully!');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ Tests failed');
    console.log('═══════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run tests
runTests();
