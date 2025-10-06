const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test credentials - replace with actual admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = null;

async function login() {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
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

async function testGetEventTypes() {
  try {
    console.log('Testing GET /api/event-types...');
    const response = await axios.get(`${API_URL}/api/event-types`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✓ GET /api/event-types successful');
    console.log('Response structure:', Object.keys(response.data));
    console.log('Basic events:', response.data.basic?.length || 0);
    console.log('Penalty events:', response.data.penalty?.length || 0);
    console.log('Bonus events:', response.data.bonus?.length || 0);
    
    // Show sample event
    if (response.data.basic && response.data.basic.length > 0) {
      console.log('\nSample event:', response.data.basic[0]);
    }
    
    console.log('');
    return response.data;
  } catch (error) {
    console.error('✗ GET /api/event-types failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateEventType(eventTypeId, newPointValue) {
  try {
    console.log(`Testing PUT /api/event-types/${eventTypeId}...`);
    const response = await axios.put(
      `${API_URL}/api/event-types/${eventTypeId}`,
      { point_value: newPointValue },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log('✓ PUT /api/event-types/:id successful');
    console.log('Updated event:', response.data);
    console.log('');
    return response.data;
  } catch (error) {
    console.error('✗ PUT /api/event-types/:id failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateEventTypeValidation() {
  try {
    console.log('Testing PUT /api/event-types validation (invalid point_value)...');
    await axios.put(
      `${API_URL}/api/event-types/1`,
      { point_value: 'invalid' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.error('✗ Validation should have failed but did not\n');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Validation correctly rejected invalid point_value');
      console.log('Error message:', error.response.data.error);
      console.log('');
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Event Type Management API Tests');
  console.log('='.repeat(60));
  console.log('');

  // Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('Cannot proceed without authentication');
    return;
  }

  // Test GET endpoint
  const eventTypes = await testGetEventTypes();
  if (!eventTypes) {
    console.log('Cannot proceed without event types');
    return;
  }

  // Test UPDATE endpoint with first basic event
  if (eventTypes.basic && eventTypes.basic.length > 0) {
    const firstEvent = eventTypes.basic[0];
    const originalValue = firstEvent.point_value;
    const newValue = originalValue + 1;
    
    // Update to new value
    await testUpdateEventType(firstEvent.id, newValue);
    
    // Update back to original value
    await testUpdateEventType(firstEvent.id, originalValue);
  }

  // Test validation
  await testUpdateEventTypeValidation();

  console.log('='.repeat(60));
  console.log('Tests completed');
  console.log('='.repeat(60));
}

runTests();
