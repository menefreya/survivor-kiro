const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';

// Test credentials - you'll need to use actual admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';

async function login() {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    adminToken = response.data.token;
    console.log('✓ Login successful\n');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkDraftStatus() {
  try {
    console.log('Checking draft status...');
    const response = await axios.get(`${API_URL}/draft/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✓ Draft status:', response.data);
    return response.data;
  } catch (error) {
    console.error('✗ Failed to check draft status:', error.response?.data || error.message);
    return null;
  }
}

async function triggerDraft() {
  try {
    console.log('\nTriggering draft...');
    const response = await axios.post(`${API_URL}/draft`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✓ Draft completed successfully!');
    console.log('  Pick count:', response.data.pickCount);
    console.log('  Picks:', JSON.stringify(response.data.picks, null, 2));
    return response.data;
  } catch (error) {
    console.error('✗ Draft failed:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('=== Draft API Test ===\n');
  
  // Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\nPlease ensure:');
    console.log('1. Server is running (npm run dev in backend folder)');
    console.log('2. Admin user exists with credentials above');
    console.log('3. Database is properly configured');
    return;
  }

  // Check initial draft status
  await checkDraftStatus();

  // Trigger draft
  await triggerDraft();

  // Check draft status again
  console.log('\n');
  await checkDraftStatus();

  console.log('\n=== Test Complete ===');
}

runTests();
