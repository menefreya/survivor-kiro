/**
 * Manual test script for contestant endpoints
 * Run this after starting the server to verify the implementation
 * 
 * Usage: node test-contestants.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// You'll need to replace these with actual tokens from your database
// For testing, you can:
// 1. Sign up/login to get a regular user token
// 2. Manually set is_admin=true in the database for an admin token
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE';
const USER_TOKEN = 'YOUR_USER_TOKEN_HERE';

async function testContestantEndpoints() {
  console.log('Testing Contestant Endpoints...\n');

  try {
    // Test 1: Get all contestants (requires auth)
    console.log('1. Testing GET /api/contestants (with auth)');
    try {
      const response = await axios.get(`${API_BASE_URL}/contestants`, {
        headers: { Authorization: `Bearer ${USER_TOKEN}` }
      });
      console.log('✓ Success:', response.data.length, 'contestants found');
    } catch (error) {
      console.log('✗ Error:', error.response?.data || error.message);
    }

    // Test 2: Get all contestants (without auth - should fail)
    console.log('\n2. Testing GET /api/contestants (without auth - should fail)');
    try {
      await axios.get(`${API_BASE_URL}/contestants`);
      console.log('✗ Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ Correctly rejected:', error.response.data.error);
      } else {
        console.log('✗ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 3: Add contestant (admin only)
    console.log('\n3. Testing POST /api/contestants (admin only)');
    try {
      const newContestant = {
        name: 'Test Contestant',
        profession: 'Software Engineer',
        image_url: 'https://example.com/image.jpg'
      };
      const response = await axios.post(`${API_BASE_URL}/contestants`, newContestant, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      console.log('✓ Success: Created contestant with ID', response.data.id);
      
      // Store ID for update test
      global.testContestantId = response.data.id;
    } catch (error) {
      console.log('✗ Error:', error.response?.data || error.message);
    }

    // Test 4: Add contestant (non-admin - should fail)
    console.log('\n4. Testing POST /api/contestants (non-admin - should fail)');
    try {
      const newContestant = {
        name: 'Another Test Contestant',
        profession: 'Teacher'
      };
      await axios.post(`${API_BASE_URL}/contestants`, newContestant, {
        headers: { Authorization: `Bearer ${USER_TOKEN}` }
      });
      console.log('✗ Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✓ Correctly rejected:', error.response.data.error);
      } else {
        console.log('✗ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 5: Update contestant (admin only)
    if (global.testContestantId) {
      console.log('\n5. Testing PUT /api/contestants/:id (admin only)');
      try {
        const updates = {
          profession: 'Updated Profession',
          is_eliminated: true
        };
        const response = await axios.put(
          `${API_BASE_URL}/contestants/${global.testContestantId}`,
          updates,
          { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
        );
        console.log('✓ Success: Updated contestant', response.data);
      } catch (error) {
        console.log('✗ Error:', error.response?.data || error.message);
      }
    }

    // Test 6: Update contestant (non-admin - should fail)
    if (global.testContestantId) {
      console.log('\n6. Testing PUT /api/contestants/:id (non-admin - should fail)');
      try {
        const updates = { profession: 'Hacker' };
        await axios.put(
          `${API_BASE_URL}/contestants/${global.testContestantId}`,
          updates,
          { headers: { Authorization: `Bearer ${USER_TOKEN}` } }
        );
        console.log('✗ Should have failed but succeeded');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✓ Correctly rejected:', error.response.data.error);
        } else {
          console.log('✗ Unexpected error:', error.response?.data || error.message);
        }
      }
    }

    // Test 7: Add contestant without name (should fail validation)
    console.log('\n7. Testing POST /api/contestants (missing name - should fail)');
    try {
      const invalidContestant = {
        profession: 'Teacher'
      };
      await axios.post(`${API_BASE_URL}/contestants`, invalidContestant, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      console.log('✗ Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✓ Correctly rejected:', error.response.data.error);
      } else {
        console.log('✗ Unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('\n✅ All tests completed!');
    console.log('\nNote: Replace ADMIN_TOKEN and USER_TOKEN with actual tokens to run tests.');

  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

// Run tests
testContestantEndpoints();
