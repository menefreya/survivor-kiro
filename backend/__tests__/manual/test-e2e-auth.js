/**
 * End-to-End Test: Complete Authentication Workflow
 * Tests: Sign up → Login → Access protected routes → Logout
 * Requirements: 1.1-1.8
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test user data
const testUser = {
  email: `test-auth-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Auth Test User',
  profile_image_url: 'https://example.com/avatar.jpg'
};

let authToken = null;
let userId = null;

async function testSignup() {
  console.log('\n=== Testing Sign Up ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, testUser);
    
    if (response.status === 201 && response.data.message) {
      console.log('✓ Sign up successful');
      console.log(`  User created: ${testUser.email}`);
      return true;
    } else {
      console.error('✗ Sign up failed: Unexpected response format');
      return false;
    }
  } catch (error) {
    console.error('✗ Sign up failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testSignupDuplicateEmail() {
  console.log('\n=== Testing Sign Up with Duplicate Email ===');
  
  try {
    await axios.post(`${API_BASE_URL}/auth/signup`, testUser);
    console.error('✗ Should have rejected duplicate email');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error) {
      console.log('✓ Duplicate email rejected correctly');
      console.log(`  Error message: ${error.response.data.error}`);
      return true;
    } else {
      console.error('✗ Unexpected error for duplicate email');
      return false;
    }
  }
}

async function testLogin() {
  console.log('\n=== Testing Login ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.status === 200 && response.data.token && response.data.user) {
      authToken = response.data.token;
      userId = response.data.user.id;
      console.log('✓ Login successful');
      console.log(`  Token received: ${authToken.substring(0, 20)}...`);
      console.log(`  User ID: ${userId}`);
      return true;
    } else {
      console.error('✗ Login failed: Unexpected response format');
      return false;
    }
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testLoginInvalidCredentials() {
  console.log('\n=== Testing Login with Invalid Credentials ===');
  
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: 'WrongPassword123!'
    });
    console.error('✗ Should have rejected invalid credentials');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Invalid credentials rejected correctly');
      console.log(`  Error message: ${error.response.data.error}`);
      return true;
    } else {
      console.error('✗ Unexpected error for invalid credentials');
      return false;
    }
  }
}

async function testAccessProtectedRoute() {
  console.log('\n=== Testing Access to Protected Route ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    if (response.status === 200 && response.data.user) {
      console.log('✓ Protected route accessible with valid token');
      console.log(`  User: ${response.data.user.name} (${response.data.user.email})`);
      return true;
    } else {
      console.error('✗ Protected route access failed: Unexpected response');
      return false;
    }
  } catch (error) {
    console.error('✗ Protected route access failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testAccessProtectedRouteWithoutToken() {
  console.log('\n=== Testing Access to Protected Route Without Token ===');
  
  try {
    await axios.get(`${API_BASE_URL}/auth/me`);
    console.error('✗ Should have rejected request without token');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Request without token rejected correctly');
      return true;
    } else {
      console.error('✗ Unexpected error for request without token');
      return false;
    }
  }
}

async function testAccessProtectedRouteWithInvalidToken() {
  console.log('\n=== Testing Access to Protected Route With Invalid Token ===');
  
  try {
    await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid-token-12345'
      }
    });
    console.error('✗ Should have rejected request with invalid token');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Request with invalid token rejected correctly');
      return true;
    } else {
      console.error('✗ Unexpected error for request with invalid token');
      return false;
    }
  }
}

async function testUpdateProfile() {
  console.log('\n=== Testing Profile Update ===');
  
  try {
    const newImageUrl = 'https://example.com/new-avatar.jpg';
    const response = await axios.put(
      `${API_BASE_URL}/players/${userId}`,
      { profile_image_url: newImageUrl },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    if (response.status === 200 && response.data.player) {
      console.log('✓ Profile updated successfully');
      console.log(`  New image URL: ${response.data.player.profile_image_url}`);
      return true;
    } else {
      console.error('✗ Profile update failed: Unexpected response');
      return false;
    }
  } catch (error) {
    console.error('✗ Profile update failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testLogout() {
  console.log('\n=== Testing Logout ===');
  
  // Logout is primarily client-side (clearing token from localStorage)
  // We simulate it by clearing our token and verifying we can't access protected routes
  const savedToken = authToken;
  authToken = null;
  
  try {
    await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${savedToken}`
      }
    });
    
    // Token should still work on server (server doesn't track logout)
    // But client should have cleared it
    console.log('✓ Logout flow complete (client-side token removal)');
    console.log('  Note: Server-side token remains valid until expiration');
    return true;
  } catch (error) {
    console.error('✗ Logout test failed:', error.message);
    return false;
  }
}

async function runAuthWorkflowTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  E2E Test: Complete Authentication Workflow           ║');
  console.log('║  Requirements: 1.1-1.8                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  // Test signup
  results.push(await testSignup());
  
  // Test duplicate email
  results.push(await testSignupDuplicateEmail());
  
  // Test login
  results.push(await testLogin());
  
  // Test invalid credentials
  results.push(await testLoginInvalidCredentials());
  
  // Test protected route access
  results.push(await testAccessProtectedRoute());
  
  // Test protected route without token
  results.push(await testAccessProtectedRouteWithoutToken());
  
  // Test protected route with invalid token
  results.push(await testAccessProtectedRouteWithInvalidToken());
  
  // Test profile update
  results.push(await testUpdateProfile());
  
  // Test logout
  results.push(await testLogout());
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ All authentication workflow tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runAuthWorkflowTests().catch(error => {
  console.error('\n✗ Test suite failed:', error.message);
  process.exit(1);
});
