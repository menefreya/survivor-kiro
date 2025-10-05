const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

let adminToken;
let playerToken;
let eventTypeId;

async function testEventTypeUpdate() {
  console.log('🧪 Testing Event Type Update Endpoint\n');

  try {
    // 1. Login as admin
    console.log('1️⃣  Logging in as admin...');
    const adminLogin = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    adminToken = adminLogin.data.token;
    console.log('✅ Admin logged in\n');

    // 2. Login as regular player
    console.log('2️⃣  Logging in as regular player...');
    const playerLogin = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'player1@example.com',
      password: 'password123'
    });
    playerToken = playerLogin.data.token;
    console.log('✅ Player logged in\n');

    // 3. Get event types to find one to update
    console.log('3️⃣  Fetching event types...');
    const eventTypesResponse = await axios.get(`${API_URL}/api/event-types`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    // Get first event type from basic category
    const basicEvents = eventTypesResponse.data.basic;
    if (!basicEvents || basicEvents.length === 0) {
      throw new Error('No basic event types found');
    }
    
    eventTypeId = basicEvents[0].id;
    const originalPointValue = basicEvents[0].point_value;
    console.log(`✅ Found event type: ${basicEvents[0].display_name} (ID: ${eventTypeId})`);
    console.log(`   Original point value: ${originalPointValue}\n`);

    // 4. Test: Update event type as admin (should succeed)
    console.log('4️⃣  Testing update as admin...');
    const newPointValue = originalPointValue + 5;
    const updateResponse = await axios.put(
      `${API_URL}/api/event-types/${eventTypeId}`,
      { point_value: newPointValue },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (updateResponse.data.point_value === newPointValue) {
      console.log(`✅ Event type updated successfully to ${newPointValue} points\n`);
    } else {
      throw new Error('Point value not updated correctly');
    }

    // 5. Test: Verify the update persisted
    console.log('5️⃣  Verifying update persisted...');
    const verifyResponse = await axios.get(`${API_URL}/api/event-types`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const updatedEvent = verifyResponse.data.basic.find(e => e.id === eventTypeId);
    if (updatedEvent.point_value === newPointValue) {
      console.log(`✅ Update verified: ${updatedEvent.display_name} = ${updatedEvent.point_value} points\n`);
    } else {
      throw new Error('Update did not persist');
    }

    // 6. Test: Update as regular player (should fail)
    console.log('6️⃣  Testing update as regular player (should fail)...');
    try {
      await axios.put(
        `${API_URL}/api/event-types/${eventTypeId}`,
        { point_value: 100 },
        { headers: { Authorization: `Bearer ${playerToken}` } }
      );
      throw new Error('Player should not be able to update event types');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Correctly rejected non-admin user\n');
      } else {
        throw error;
      }
    }

    // 7. Test: Update without authentication (should fail)
    console.log('7️⃣  Testing update without authentication (should fail)...');
    try {
      await axios.put(
        `${API_URL}/api/event-types/${eventTypeId}`,
        { point_value: 100 }
      );
      throw new Error('Unauthenticated request should fail');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request\n');
      } else {
        throw error;
      }
    }

    // 8. Test: Invalid point value (not a number)
    console.log('8️⃣  Testing invalid point value (string)...');
    try {
      await axios.put(
        `${API_URL}/api/event-types/${eventTypeId}`,
        { point_value: "invalid" },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Should reject non-numeric point value');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected non-numeric point value\n');
      } else {
        throw error;
      }
    }

    // 9. Test: Invalid point value (decimal)
    console.log('9️⃣  Testing invalid point value (decimal)...');
    try {
      await axios.put(
        `${API_URL}/api/event-types/${eventTypeId}`,
        { point_value: 3.5 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Should reject decimal point value');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected decimal point value\n');
      } else {
        throw error;
      }
    }

    // 10. Test: Missing point value
    console.log('🔟 Testing missing point value...');
    try {
      await axios.put(
        `${API_URL}/api/event-types/${eventTypeId}`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Should reject missing point value');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing point value\n');
      } else {
        throw error;
      }
    }

    // 11. Test: Non-existent event type
    console.log('1️⃣1️⃣  Testing non-existent event type...');
    try {
      await axios.put(
        `${API_URL}/api/event-types/99999`,
        { point_value: 5 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Should reject non-existent event type');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly rejected non-existent event type\n');
      } else {
        throw error;
      }
    }

    // 12. Test: Negative point value (should be allowed for penalties)
    console.log('1️⃣2️⃣  Testing negative point value...');
    const negativeValue = -10;
    const negativeResponse = await axios.put(
      `${API_URL}/api/event-types/${eventTypeId}`,
      { point_value: negativeValue },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (negativeResponse.data.point_value === negativeValue) {
      console.log(`✅ Negative point value accepted: ${negativeValue} points\n`);
    } else {
      throw new Error('Negative point value not accepted');
    }

    // 13. Restore original value
    console.log('1️⃣3️⃣  Restoring original point value...');
    await axios.put(
      `${API_URL}/api/event-types/${eventTypeId}`,
      { point_value: originalPointValue },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Restored to original value: ${originalPointValue} points\n`);

    console.log('✅ All tests passed! Event type update endpoint is working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testEventTypeUpdate();
