/**
 * Manual test script for authentication endpoints
 * Run with: node test-auth.js
 * 
 * Make sure the server is running on PORT 3001 before running this script
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test data
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Test User',
  profile_image_url: 'https://example.com/avatar.jpg'
};

let authToken = '';

async function testSignup() {
  console.log('\n=== Testing Signup ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, testUser);
    console.log('✓ Signup successful');
    console.log('Response:', response.data);
    authToken = response.data.token;
    return true;
  } catch (error) {
    console.error('✗ Signup failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDuplicateSignup() {
  console.log('\n=== Testing Duplicate Email Signup ===');
  try {
    await axios.post(`${API_BASE_URL}/auth/signup`, testUser);
    console.error('✗ Should have failed with duplicate email');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already registered')) {
      console.log('✓ Correctly rejected duplicate email');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n=== Testing Login ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✓ Login successful');
    console.log('Response:', response.data);
    authToken = response.data.token;
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n=== Testing Invalid Login ===');
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: 'wrongpassword'
    });
    console.error('✗ Should have failed with invalid credentials');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly rejected invalid credentials');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testGetCurrentUser() {
  console.log('\n=== Testing Get Current User ===');
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✓ Get current user successful');
    console.log('User data:', response.data);
    return true;
  } catch (error) {
    console.error('✗ Get current user failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetCurrentUserWithoutToken() {
  console.log('\n=== Testing Get Current User Without Token ===');
  try {
    await axios.get(`${API_BASE_URL}/auth/me`);
    console.error('✗ Should have failed without token');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly rejected request without token');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testLogout() {
  console.log('\n=== Testing Logout ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`);
    console.log('✓ Logout successful');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('✗ Logout failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting authentication endpoint tests...');
  console.log('Make sure the server is running on port 3001');
  
  const results = [];
  
  // Run tests in sequence
  results.push(await testSignup());
  results.push(await testDuplicateSignup());
  results.push(await testLogin());
  results.push(await testInvalidLogin());
  results.push(await testGetCurrentUser());
  results.push(await testGetCurrentUserWithoutToken());
  results.push(await testLogout());
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✓ All tests passed!');
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
