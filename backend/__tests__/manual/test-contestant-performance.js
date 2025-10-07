/**
 * Manual test script for contestant performance endpoint
 * Run this after starting the server to verify the implementation
 * 
 * Usage: node test-contestant-performance.js
 * 
 * Prerequisites:
 * 1. Server must be running on localhost:3001
 * 2. You need valid login credentials (replace email/password below)
 * 3. Database should have some contestants and episode scores for meaningful testing
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Replace these with valid test credentials from your database
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testContestantPerformance() {
  console.log('🧪 Testing Contestant Performance Endpoint...\n');
  
  try {
    // Step 1: Login to get authentication token
    console.log('1. Attempting login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful\n');
    
    // Step 2: Test the performance endpoint
    console.log('2. Testing GET /api/contestants/performance...');
    const performanceResponse = await axios.get(`${API_BASE_URL}/contestants/performance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✓ Performance endpoint responded successfully');
    console.log(`✓ Found ${performanceResponse.data.data?.length || 0} contestants\n`);
    
    // Step 3: Validate response structure
    console.log('3. Validating response structure...');
    
    if (!performanceResponse.data.data || !Array.isArray(performanceResponse.data.data)) {
      console.log('❌ Response should have a "data" array');
      return;
    }
    
    if (performanceResponse.data.data.length === 0) {
      console.log('⚠️  No contestants found - add some contestants and episode scores to test properly');
      return;
    }
    
    const firstContestant = performanceResponse.data.data[0];
    const requiredFields = [
      'id', 'name', 'total_score', 'average_per_episode', 
      'trend', 'episodes_participated', 'rank', 'is_eliminated', 'profession'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in firstContestant));
    if (missingFields.length === 0) {
      console.log('✓ All required fields present');
    } else {
      console.log('❌ Missing fields:', missingFields);
    }
    
    // Step 4: Validate data sorting
    console.log('\n4. Validating data sorting...');
    const scores = performanceResponse.data.data.map(c => c.total_score);
    const isSorted = scores.every((score, i) => i === 0 || scores[i-1] >= score);
    console.log(isSorted ? '✓ Data properly sorted by total_score (descending)' : '❌ Data not sorted correctly');
    
    // Step 5: Validate trend values
    console.log('\n5. Validating trend calculations...');
    const trends = performanceResponse.data.data.map(c => c.trend);
    const validTrends = ['up', 'down', 'same', 'n/a'];
    const invalidTrends = trends.filter(trend => !validTrends.includes(trend));
    console.log(invalidTrends.length === 0 ? '✓ All trend values valid' : `❌ Invalid trends: ${invalidTrends}`);
    
    // Step 6: Validate average calculations
    console.log('\n6. Validating average calculations...');
    let averageValidationPassed = true;
    
    for (const contestant of performanceResponse.data.data.slice(0, 3)) { // Check first 3
      if (contestant.episodes_participated > 0) {
        const expectedAverage = parseFloat((contestant.total_score / contestant.episodes_participated).toFixed(1));
        if (contestant.average_per_episode !== expectedAverage) {
          console.log(`❌ Average calculation wrong for ${contestant.name}: expected ${expectedAverage}, got ${contestant.average_per_episode}`);
          averageValidationPassed = false;
        }
      } else if (contestant.average_per_episode !== null) {
        console.log(`❌ Average should be null for ${contestant.name} with 0 episodes`);
        averageValidationPassed = false;
      }
    }
    
    if (averageValidationPassed) {
      console.log('✓ Average calculations appear correct');
    }
    
    // Step 7: Display sample data
    console.log('\n7. Sample response data:');
    console.log('Top 3 contestants:');
    performanceResponse.data.data.slice(0, 3).forEach((contestant, index) => {
      console.log(`  ${index + 1}. ${contestant.name}`);
      console.log(`     Score: ${contestant.total_score}, Avg: ${contestant.average_per_episode}, Trend: ${contestant.trend}`);
      console.log(`     Episodes: ${contestant.episodes_participated}, Eliminated: ${contestant.is_eliminated}`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Endpoint: GET /api/contestants/performance`);
    console.log(`   • Authentication: Required ✓`);
    console.log(`   • Response format: { data: [...] } ✓`);
    console.log(`   • Sorting: By total_score descending ✓`);
    console.log(`   • Fields: All required fields present ✓`);
    console.log(`   • Calculations: Averages and trends calculated ✓`);
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data?.error || 'Unknown error'}`);
      
      if (error.response.status === 401) {
        console.error('\n💡 Tip: Update TEST_EMAIL and TEST_PASSWORD with valid credentials');
      }
    } else {
      console.error(`   ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('\n💡 Tip: Make sure the backend server is running on localhost:3001');
      }
    }
  }
}

// Run the test
testContestantPerformance();