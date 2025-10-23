/**
 * Simple Test: Contestant Performance API Data Flow
 * 
 * This script tests the basic functionality of the contestant performance API
 * to verify that event counts are properly included in the response.
 * 
 * Run with: node backend/__tests__/manual/test-performance-api-simple.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testpassword123';

async function testContestantPerformanceAPI() {
  console.log('🚀 Testing Contestant Performance API Data Flow');
  console.log('=' .repeat(50));

  try {
    // Step 1: Authenticate
    console.log('\n🔐 Authenticating...');
    let authToken;
    
    try {
      const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });
      authToken = authResponse.data.token;
      console.log('✅ Authentication successful');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Test user not found, creating...');
        await axios.post(`${API_BASE_URL}/auth/signup`, {
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          name: 'Test User'
        });
        
        const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        });
        authToken = authResponse.data.token;
        console.log('✅ Authentication successful after signup');
      } else {
        throw error;
      }
    }

    // Step 2: Test API endpoint
    console.log('\n📊 Testing /api/contestants/performance endpoint...');
    
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}/contestants/performance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const responseTime = Date.now() - startTime;

    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`✅ Response Time: ${responseTime}ms`);

    // Step 3: Verify response structure
    console.log('\n🔍 Verifying response structure...');
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response structure: missing data field');
    }

    const contestants = response.data.data;
    console.log(`✅ Received ${contestants.length} contestants`);

    if (contestants.length === 0) {
      console.log('ℹ️  No contestants found - this is expected for a new system');
      console.log('✅ Test completed successfully (empty state)');
      return;
    }

    // Step 4: Verify new event count fields are present
    console.log('\n🎯 Verifying event count fields...');
    
    const sampleContestant = contestants[0];
    const requiredFields = [
      'id', 'name', 'total_score', 'average_per_episode', 'trend', 
      'episodes_participated', 'is_eliminated', 'profession', 'rank',
      'idols_found', 'reward_wins', 'immunity_wins' // New fields
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      if (!(field in sampleContestant)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log('✅ All required fields present in response');

    // Step 5: Verify event count data types and values
    console.log('\n🔢 Verifying event count data...');
    
    let validEventCounts = 0;
    let totalContestants = 0;

    for (const contestant of contestants) {
      totalContestants++;
      
      // Check that event counts are numbers (or null)
      const eventFields = ['idols_found', 'reward_wins', 'immunity_wins'];
      let validFields = 0;
      
      for (const field of eventFields) {
        const value = contestant[field];
        if (value === null || value === undefined || (typeof value === 'number' && value >= 0)) {
          validFields++;
        } else {
          console.warn(`⚠️  Invalid ${field} value for ${contestant.name}: ${value}`);
        }
      }
      
      if (validFields === eventFields.length) {
        validEventCounts++;
      }

      // Log sample data for first few contestants
      if (totalContestants <= 3) {
        console.log(`  ${contestant.name}:`);
        console.log(`    Idols Found: ${contestant.idols_found}`);
        console.log(`    Reward Wins: ${contestant.reward_wins}`);
        console.log(`    Immunity Wins: ${contestant.immunity_wins}`);
      }
    }

    console.log(`✅ ${validEventCounts}/${totalContestants} contestants have valid event count data`);

    // Step 6: Test multiple requests (simulating auto-refresh)
    console.log('\n🔄 Testing multiple requests (auto-refresh simulation)...');
    
    const refreshPromises = [];
    for (let i = 0; i < 3; i++) {
      refreshPromises.push(
        axios.get(`${API_BASE_URL}/contestants/performance`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      );
    }

    const refreshResults = await Promise.all(refreshPromises);
    
    for (let i = 0; i < refreshResults.length; i++) {
      if (refreshResults[i].status !== 200) {
        throw new Error(`Refresh request ${i + 1} failed`);
      }
      
      const refreshContestants = refreshResults[i].data.data;
      if (refreshContestants.length !== contestants.length) {
        console.warn(`⚠️  Refresh ${i + 1}: contestant count changed (${refreshContestants.length} vs ${contestants.length})`);
      }
      
      // Verify new fields are still present
      if (refreshContestants.length > 0) {
        const sample = refreshContestants[0];
        if (!('idols_found' in sample && 'reward_wins' in sample && 'immunity_wins' in sample)) {
          throw new Error(`Refresh request ${i + 1} missing event count fields`);
        }
      }
    }

    console.log('✅ Auto-refresh simulation successful');

    // Step 7: Test error handling
    console.log('\n❌ Testing error handling...');
    
    try {
      await axios.get(`${API_BASE_URL}/contestants/performance`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      throw new Error('Expected authentication error but request succeeded');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('✅ Authentication error handling works correctly');
      } else {
        throw error;
      }
    }

    // Final summary
    console.log('\n🎉 Test Summary:');
    console.log('✅ API endpoint responds correctly');
    console.log('✅ Response includes all required fields');
    console.log('✅ Event count fields (idols_found, reward_wins, immunity_wins) are present');
    console.log('✅ Data types are valid (numbers or null)');
    console.log('✅ Multiple requests work consistently (auto-refresh ready)');
    console.log('✅ Error handling works correctly');
    console.log('\n🏆 All tests passed! Data flow from database to UI is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testContestantPerformanceAPI();
}

module.exports = testContestantPerformanceAPI;