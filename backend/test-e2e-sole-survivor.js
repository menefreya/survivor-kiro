/**
 * End-to-End Test: Sole Survivor Re-pick After Elimination
 * Tests: Mark sole survivor as eliminated → Player selects new sole survivor
 * Requirements: 2.6
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test data
const adminUser = {
  email: `admin-ss-${Date.now()}@example.com`,
  password: 'AdminPass123!',
  name: 'Admin User'
};

const testPlayer = {
  email: `player-ss-${Date.now()}@example.com`,
  password: 'PlayerPass123!',
  name: 'Test Player'
};

const testContestants = [
  { name: 'Survivor A', profession: 'Teacher', image_url: 'https://example.com/a.jpg' },
  { name: 'Survivor B', profession: 'Engineer', image_url: 'https://example.com/b.jpg' },
  { name: 'Survivor C', profession: 'Doctor', image_url: 'https://example.com/c.jpg' }
];

let adminToken = null;
let playerToken = null;
let playerId = null;
let contestantIds = [];

async function setupAdminAndContestants() {
  console.log('\n=== Setting Up Admin and Contestants ===');
  
  try {
    // Create admin
    await axios.post(`${API_BASE_URL}/auth/signup`, adminUser);
    const adminLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: adminUser.email,
      password: adminUser.password
    });
    adminToken = adminLogin.data.token;
    
    // Create contestants
    for (const contestant of testContestants) {
      const response = await axios.post(
        `${API_BASE_URL}/contestants`,
        contestant,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      contestantIds.push(response.data.contestant.id);
    }
    
    console.log('✓ Admin and contestants set up successfully');
    console.log(`  Created ${contestantIds.length} contestants`);
    return true;
  } catch (error) {
    console.error('✗ Setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function setupPlayer() {
  console.log('\n=== Setting Up Player ===');
  
  try {
    // Sign up player
    await axios.post(`${API_BASE_URL}/auth/signup`, testPlayer);
    
    // Login player
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testPlayer.email,
      password: testPlayer.password
    });
    
    playerToken = loginResponse.data.token;
    playerId = loginResponse.data.user.id;
    
    console.log('✓ Player set up successfully');
    console.log(`  Player ID: ${playerId}`);
    return true;
  } catch (error) {
    console.error('✗ Player setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testInitialSoleSurvivorPick() {
  console.log('\n=== Testing Initial Sole Survivor Pick ===');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      { sole_survivor_id: contestantIds[0] },
      {
        headers: { Authorization: `Bearer ${playerToken}` }
      }
    );
    
    if (response.status === 200 && response.data.player) {
      console.log('✓ Initial sole survivor pick successful');
      console.log(`  Selected: Contestant ID ${contestantIds[0]}`);
      return true;
    } else {
      console.error('✗ Initial sole survivor pick failed');
      return false;
    }
  } catch (error) {
    console.error('✗ Initial sole survivor pick failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewInitialSoleSurvivor() {
  console.log('\n=== Testing View Initial Sole Survivor ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/players/${playerId}`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    
    if (response.status === 200 && response.data.player) {
      const player = response.data.player;
      console.log('✓ Player data retrieved');
      console.log(`  Sole Survivor: ${player.sole_survivor?.name || 'Not set'}`);
      console.log(`  Sole Survivor ID: ${player.sole_survivor_id}`);
      
      if (player.sole_survivor_id === contestantIds[0]) {
        console.log('  ✓ Sole survivor matches initial pick');
        return true;
      } else {
        console.error('  ✗ Sole survivor does not match initial pick');
        return false;
      }
    } else {
      console.error('✗ Failed to retrieve player data');
      return false;
    }
  } catch (error) {
    console.error('✗ View player failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testMarkSoleSurvivorEliminated() {
  console.log('\n=== Testing Mark Sole Survivor as Eliminated ===');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/contestants/${contestantIds[0]}`,
      { is_eliminated: true },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 200 && response.data.contestant.is_eliminated) {
      console.log('✓ Sole survivor marked as eliminated');
      console.log(`  ${response.data.contestant.name} is now eliminated`);
      return true;
    } else {
      console.error('✗ Failed to mark contestant as eliminated');
      return false;
    }
  } catch (error) {
    console.error('✗ Mark eliminated failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testVerifyEliminatedStatus() {
  console.log('\n=== Testing Verify Eliminated Status ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data.contestants)) {
      const eliminatedContestant = response.data.contestants.find(c => c.id === contestantIds[0]);
      
      if (eliminatedContestant && eliminatedContestant.is_eliminated) {
        console.log('✓ Contestant is marked as eliminated');
        console.log(`  ${eliminatedContestant.name} - Eliminated: ${eliminatedContestant.is_eliminated}`);
        return true;
      } else {
        console.error('✗ Contestant is not marked as eliminated');
        return false;
      }
    } else {
      console.error('✗ Failed to retrieve contestants');
      return false;
    }
  } catch (error) {
    console.error('✗ Verify eliminated status failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testRePickSoleSurvivor() {
  console.log('\n=== Testing Re-pick Sole Survivor ===');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      { sole_survivor_id: contestantIds[1] },
      {
        headers: { Authorization: `Bearer ${playerToken}` }
      }
    );
    
    if (response.status === 200 && response.data.player) {
      console.log('✓ Sole survivor re-pick successful');
      console.log(`  New selection: Contestant ID ${contestantIds[1]}`);
      return true;
    } else {
      console.error('✗ Sole survivor re-pick failed');
      return false;
    }
  } catch (error) {
    console.error('✗ Sole survivor re-pick failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testVerifyNewSoleSurvivor() {
  console.log('\n=== Testing Verify New Sole Survivor ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/players/${playerId}`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    
    if (response.status === 200 && response.data.player) {
      const player = response.data.player;
      console.log('✓ Player data retrieved');
      console.log(`  New Sole Survivor: ${player.sole_survivor?.name || 'Not set'}`);
      console.log(`  New Sole Survivor ID: ${player.sole_survivor_id}`);
      
      if (player.sole_survivor_id === contestantIds[1]) {
        console.log('  ✓ Sole survivor updated correctly');
        return true;
      } else {
        console.error('  ✗ Sole survivor was not updated');
        return false;
      }
    } else {
      console.error('✗ Failed to retrieve player data');
      return false;
    }
  } catch (error) {
    console.error('✗ Verify new sole survivor failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testRePickToAnotherContestant() {
  console.log('\n=== Testing Re-pick to Another Contestant ===');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerId}`,
      { sole_survivor_id: contestantIds[2] },
      {
        headers: { Authorization: `Bearer ${playerToken}` }
      }
    );
    
    if (response.status === 200 && response.data.player) {
      console.log('✓ Second re-pick successful');
      console.log(`  Final selection: Contestant ID ${contestantIds[2]}`);
      
      // Verify
      const verifyResponse = await axios.get(`${API_BASE_URL}/players/${playerId}`, {
        headers: { Authorization: `Bearer ${playerToken}` }
      });
      
      if (verifyResponse.data.player.sole_survivor_id === contestantIds[2]) {
        console.log('  ✓ Final sole survivor verified');
        return true;
      } else {
        console.error('  ✗ Final sole survivor not updated');
        return false;
      }
    } else {
      console.error('✗ Second re-pick failed');
      return false;
    }
  } catch (error) {
    console.error('✗ Second re-pick failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function runSoleSurvivorTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  E2E Test: Sole Survivor Re-pick After Elimination    ║');
  console.log('║  Requirements: 2.6                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  // Setup
  results.push(await setupAdminAndContestants());
  results.push(await setupPlayer());
  
  // Initial pick
  results.push(await testInitialSoleSurvivorPick());
  results.push(await testViewInitialSoleSurvivor());
  
  // Elimination and re-pick
  results.push(await testMarkSoleSurvivorEliminated());
  results.push(await testVerifyEliminatedStatus());
  results.push(await testRePickSoleSurvivor());
  results.push(await testVerifyNewSoleSurvivor());
  
  // Additional re-pick
  results.push(await testRePickToAnotherContestant());
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ All sole survivor re-pick tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runSoleSurvivorTests().catch(error => {
  console.error('\n✗ Test suite failed:', error.message);
  process.exit(1);
});
