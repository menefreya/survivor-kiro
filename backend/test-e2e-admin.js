/**
 * End-to-End Test: Complete Admin Workflow
 * Tests: Login as admin → Add contestants → Trigger draft → Add episode scores → View leaderboard updates
 * Requirements: 1.4-1.8, 3.1, 4.1-4.6, 5.3
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test data
const adminUser = {
  email: `admin-${Date.now()}@example.com`,
  password: 'AdminPass123!',
  name: 'Admin User'
};

const testPlayers = [
  {
    email: `player1-${Date.now()}@example.com`,
    password: 'Player1Pass123!',
    name: 'Test Player One'
  },
  {
    email: `player2-${Date.now()}@example.com`,
    password: 'Player2Pass123!',
    name: 'Test Player Two'
  }
];

const testContestants = [
  { name: 'Alice Anderson', profession: 'Teacher', image_url: 'https://example.com/alice.jpg' },
  { name: 'Bob Brown', profession: 'Engineer', image_url: 'https://example.com/bob.jpg' },
  { name: 'Carol Chen', profession: 'Doctor', image_url: 'https://example.com/carol.jpg' },
  { name: 'David Davis', profession: 'Artist', image_url: 'https://example.com/david.jpg' },
  { name: 'Emma Evans', profession: 'Chef', image_url: 'https://example.com/emma.jpg' }
];

let adminToken = null;
let playerTokens = [];
let playerIds = [];
let contestantIds = [];

async function testAdminSignupAndLogin() {
  console.log('\n=== Testing Admin Signup and Login ===');
  
  try {
    // Sign up
    await axios.post(`${API_BASE_URL}/auth/signup`, adminUser);
    console.log('✓ Admin signed up successfully');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: adminUser.email,
      password: adminUser.password
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      adminToken = loginResponse.data.token;
      console.log('✓ Admin logged in successfully');
      return true;
    } else {
      console.error('✗ Admin login failed');
      return false;
    }
  } catch (error) {
    console.error('✗ Admin signup/login failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testAddContestants() {
  console.log('\n=== Testing Add Contestants ===');
  
  try {
    for (const contestant of testContestants) {
      const response = await axios.post(
        `${API_BASE_URL}/contestants`,
        contestant,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      
      if (response.status === 201 && response.data.contestant) {
        contestantIds.push(response.data.contestant.id);
      } else {
        console.error(`✗ Failed to add contestant: ${contestant.name}`);
        return false;
      }
    }
    
    console.log(`✓ Added ${contestantIds.length} contestants successfully`);
    testContestants.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} - ${c.profession}`);
    });
    return true;
  } catch (error) {
    console.error('✗ Add contestants failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewAllContestants() {
  console.log('\n=== Testing View All Contestants ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data.contestants)) {
      console.log(`✓ Retrieved ${response.data.contestants.length} contestants`);
      return true;
    } else {
      console.error('✗ Failed to retrieve contestants');
      return false;
    }
  } catch (error) {
    console.error('✗ View contestants failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testUpdateContestant() {
  console.log('\n=== Testing Update Contestant ===');
  
  try {
    const updatedData = {
      name: 'Alice Anderson-Updated',
      profession: 'Principal'
    };
    
    const response = await axios.put(
      `${API_BASE_URL}/contestants/${contestantIds[0]}`,
      updatedData,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 200 && response.data.contestant) {
      console.log('✓ Contestant updated successfully');
      console.log(`  New name: ${response.data.contestant.name}`);
      console.log(`  New profession: ${response.data.contestant.profession}`);
      return true;
    } else {
      console.error('✗ Failed to update contestant');
      return false;
    }
  } catch (error) {
    console.error('✗ Update contestant failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function setupPlayersForDraft() {
  console.log('\n=== Setting Up Players for Draft ===');
  
  try {
    for (const player of testPlayers) {
      // Sign up
      await axios.post(`${API_BASE_URL}/auth/signup`, player);
      
      // Login
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: player.email,
        password: player.password
      });
      
      playerTokens.push(loginResponse.data.token);
      playerIds.push(loginResponse.data.user.id);
      
      // Submit rankings
      const rankings = contestantIds.map((id, index) => ({
        contestant_id: id,
        rank: index + 1
      }));
      
      await axios.post(
        `${API_BASE_URL}/rankings`,
        { rankings },
        {
          headers: { Authorization: `Bearer ${loginResponse.data.token}` }
        }
      );
      
      // Submit sole survivor
      await axios.put(
        `${API_BASE_URL}/sole-survivor/${loginResponse.data.user.id}`,
        { sole_survivor_id: contestantIds[0] },
        {
          headers: { Authorization: `Bearer ${loginResponse.data.token}` }
        }
      );
    }
    
    console.log(`✓ Set up ${testPlayers.length} players with rankings and sole survivor picks`);
    return true;
  } catch (error) {
    console.error('✗ Player setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testCheckDraftStatus() {
  console.log('\n=== Testing Check Draft Status (Before Draft) ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/draft/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status === 200) {
      console.log('✓ Draft status retrieved');
      console.log(`  Draft complete: ${response.data.draftComplete}`);
      return true;
    } else {
      console.error('✗ Failed to check draft status');
      return false;
    }
  } catch (error) {
    console.error('✗ Check draft status failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testTriggerDraft() {
  console.log('\n=== Testing Trigger Draft ===');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/draft`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 200 && response.data.message) {
      console.log('✓ Draft triggered successfully');
      console.log(`  ${response.data.message}`);
      
      if (response.data.draftPicks) {
        console.log(`  Total picks: ${response.data.draftPicks.length}`);
      }
      
      return true;
    } else {
      console.error('✗ Draft trigger failed');
      return false;
    }
  } catch (error) {
    console.error('✗ Draft trigger failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testPreventDuplicateDraft() {
  console.log('\n=== Testing Prevent Duplicate Draft ===');
  
  try {
    await axios.post(
      `${API_BASE_URL}/draft`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.error('✗ Should have prevented duplicate draft');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Duplicate draft prevented correctly');
      console.log(`  Error message: ${error.response.data.error}`);
      return true;
    } else {
      console.error('✗ Unexpected error for duplicate draft');
      return false;
    }
  }
}

async function testAddEpisodeScores() {
  console.log('\n=== Testing Add Episode Scores ===');
  
  try {
    const scores = contestantIds.map((id, index) => ({
      contestant_id: id,
      score: (index + 1) * 5
    }));
    
    const response = await axios.post(
      `${API_BASE_URL}/scores`,
      {
        episode_number: 1,
        scores: scores
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 201 && response.data.message) {
      console.log('✓ Episode 1 scores added successfully');
      return true;
    } else {
      console.error('✗ Failed to add episode scores');
      return false;
    }
  } catch (error) {
    console.error('✗ Add episode scores failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testAddSecondEpisodeScores() {
  console.log('\n=== Testing Add Second Episode Scores ===');
  
  try {
    const scores = contestantIds.map((id, index) => ({
      contestant_id: id,
      score: (contestantIds.length - index) * 3
    }));
    
    const response = await axios.post(
      `${API_BASE_URL}/scores`,
      {
        episode_number: 2,
        scores: scores
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 201 && response.data.message) {
      console.log('✓ Episode 2 scores added successfully');
      return true;
    } else {
      console.error('✗ Failed to add episode 2 scores');
      return false;
    }
  } catch (error) {
    console.error('✗ Add episode 2 scores failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewContestantScores() {
  console.log('\n=== Testing View Contestant Scores ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/scores/contestants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data.contestants)) {
      console.log('✓ Contestant scores retrieved successfully');
      console.log('  Contestant scores:');
      response.data.contestants.forEach(c => {
        console.log(`    ${c.name}: ${c.total_score} points`);
      });
      return true;
    } else {
      console.error('✗ Failed to retrieve contestant scores');
      return false;
    }
  } catch (error) {
    console.error('✗ View contestant scores failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewLeaderboardUpdates() {
  console.log('\n=== Testing View Leaderboard Updates ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/leaderboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data.leaderboard)) {
      console.log('✓ Leaderboard retrieved successfully');
      console.log('  Current standings:');
      response.data.leaderboard.forEach((entry, index) => {
        console.log(`    ${index + 1}. ${entry.player_name} - ${entry.total_score} points`);
      });
      return true;
    } else {
      console.error('✗ Failed to retrieve leaderboard');
      return false;
    }
  } catch (error) {
    console.error('✗ View leaderboard failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testMarkContestantEliminated() {
  console.log('\n=== Testing Mark Contestant as Eliminated ===');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/contestants/${contestantIds[0]}`,
      { is_eliminated: true },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 200 && response.data.contestant.is_eliminated) {
      console.log('✓ Contestant marked as eliminated');
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

async function runAdminWorkflowTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  E2E Test: Complete Admin Workflow                    ║');
  console.log('║  Requirements: 1.4-1.8, 3.1, 4.1-4.6, 5.3              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  // Admin authentication
  results.push(await testAdminSignupAndLogin());
  
  // Contestant management
  results.push(await testAddContestants());
  results.push(await testViewAllContestants());
  results.push(await testUpdateContestant());
  
  // Draft management
  results.push(await setupPlayersForDraft());
  results.push(await testCheckDraftStatus());
  results.push(await testTriggerDraft());
  results.push(await testPreventDuplicateDraft());
  
  // Score management
  results.push(await testAddEpisodeScores());
  results.push(await testAddSecondEpisodeScores());
  results.push(await testViewContestantScores());
  
  // Leaderboard
  results.push(await testViewLeaderboardUpdates());
  
  // Elimination
  results.push(await testMarkContestantEliminated());
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ All admin workflow tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runAdminWorkflowTests().catch(error => {
  console.error('\n✗ Test suite failed:', error.message);
  process.exit(1);
});
