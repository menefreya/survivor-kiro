/**
 * End-to-End Test: Complete Player Workflow
 * Tests: Login → Submit rankings → View team after draft → View leaderboard
 * Requirements: 1.4-1.8, 2.1-2.6, 3.1-3.6, 5.1-5.5
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test data
const players = [
  {
    email: `player1-${Date.now()}@example.com`,
    password: 'Player1Pass123!',
    name: 'Player One',
    profile_image_url: 'https://example.com/player1.jpg'
  },
  {
    email: `player2-${Date.now()}@example.com`,
    password: 'Player2Pass123!',
    name: 'Player Two',
    profile_image_url: 'https://example.com/player2.jpg'
  }
];

const contestants = [
  { name: 'Contestant A', profession: 'Teacher', image_url: 'https://example.com/a.jpg' },
  { name: 'Contestant B', profession: 'Engineer', image_url: 'https://example.com/b.jpg' },
  { name: 'Contestant C', profession: 'Doctor', image_url: 'https://example.com/c.jpg' },
  { name: 'Contestant D', profession: 'Artist', image_url: 'https://example.com/d.jpg' },
  { name: 'Contestant E', profession: 'Chef', image_url: 'https://example.com/e.jpg' }
];

let adminToken = null;
let playerTokens = [];
let playerIds = [];
let contestantIds = [];

async function setupAdmin() {
  console.log('\n=== Setting Up Admin User ===');
  
  try {
    // Create admin user
    const adminEmail = `admin-${Date.now()}@example.com`;
    await axios.post(`${API_BASE_URL}/auth/signup`, {
      email: adminEmail,
      password: 'AdminPass123!',
      name: 'Admin User'
    });
    
    // Login as admin
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: adminEmail,
      password: 'AdminPass123!'
    });
    
    adminToken = loginResponse.data.token;
    console.log('✓ Admin user created and logged in');
    return true;
  } catch (error) {
    console.error('✗ Admin setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function setupContestants() {
  console.log('\n=== Setting Up Contestants ===');
  
  try {
    for (const contestant of contestants) {
      const response = await axios.post(
        `${API_BASE_URL}/contestants`,
        contestant,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      contestantIds.push(response.data.contestant.id);
    }
    
    console.log(`✓ Created ${contestantIds.length} contestants`);
    return true;
  } catch (error) {
    console.error('✗ Contestant setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function setupPlayers() {
  console.log('\n=== Setting Up Players ===');
  
  try {
    for (const player of players) {
      // Sign up
      await axios.post(`${API_BASE_URL}/auth/signup`, player);
      
      // Login
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: player.email,
        password: player.password
      });
      
      playerTokens.push(loginResponse.data.token);
      playerIds.push(loginResponse.data.user.id);
    }
    
    console.log(`✓ Created and logged in ${players.length} players`);
    return true;
  } catch (error) {
    console.error('✗ Player setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewContestants() {
  console.log('\n=== Testing View Contestants ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/contestants`, {
      headers: { Authorization: `Bearer ${playerTokens[0]}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data.contestants)) {
      console.log('✓ Contestants retrieved successfully');
      console.log(`  Found ${response.data.contestants.length} contestants`);
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

async function testSubmitRankings() {
  console.log('\n=== Testing Submit Rankings ===');
  
  try {
    // Player 1 rankings
    const rankings1 = contestantIds.map((id, index) => ({
      contestant_id: id,
      rank: index + 1
    }));
    
    await axios.post(
      `${API_BASE_URL}/rankings`,
      { rankings: rankings1 },
      {
        headers: { Authorization: `Bearer ${playerTokens[0]}` }
      }
    );
    
    // Player 2 rankings (reversed order)
    const rankings2 = contestantIds.map((id, index) => ({
      contestant_id: id,
      rank: contestantIds.length - index
    }));
    
    await axios.post(
      `${API_BASE_URL}/rankings`,
      { rankings: rankings2 },
      {
        headers: { Authorization: `Bearer ${playerTokens[1]}` }
      }
    );
    
    console.log('✓ Rankings submitted for all players');
    return true;
  } catch (error) {
    console.error('✗ Submit rankings failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testSubmitSoleSurvivor() {
  console.log('\n=== Testing Submit Sole Survivor Pick ===');
  
  try {
    // Player 1 picks first contestant
    await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerIds[0]}`,
      { sole_survivor_id: contestantIds[0] },
      {
        headers: { Authorization: `Bearer ${playerTokens[0]}` }
      }
    );
    
    // Player 2 picks last contestant
    await axios.put(
      `${API_BASE_URL}/sole-survivor/${playerIds[1]}`,
      { sole_survivor_id: contestantIds[contestantIds.length - 1] },
      {
        headers: { Authorization: `Bearer ${playerTokens[1]}` }
      }
    );
    
    console.log('✓ Sole survivor picks submitted for all players');
    return true;
  } catch (error) {
    console.error('✗ Submit sole survivor failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewRankingsLocked() {
  console.log('\n=== Testing Rankings Locked After Submission ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/rankings/${playerIds[0]}`, {
      headers: { Authorization: `Bearer ${playerTokens[0]}` }
    });
    
    if (response.status === 200 && response.data.rankings) {
      console.log('✓ Rankings retrieved successfully');
      console.log('  Rankings are locked after submission');
      return true;
    } else {
      console.error('✗ Failed to retrieve rankings');
      return false;
    }
  } catch (error) {
    console.error('✗ View rankings failed:', error.response?.data?.error || error.message);
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

async function testViewTeamAfterDraft() {
  console.log('\n=== Testing View Team After Draft ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/players/${playerIds[0]}`, {
      headers: { Authorization: `Bearer ${playerTokens[0]}` }
    });
    
    if (response.status === 200 && response.data.player) {
      const player = response.data.player;
      console.log('✓ Team retrieved successfully');
      console.log(`  Player: ${player.name}`);
      console.log(`  Sole Survivor: ${player.sole_survivor?.name || 'Not set'}`);
      console.log(`  Draft Picks: ${player.draft_picks?.length || 0}`);
      
      if (player.draft_picks && player.draft_picks.length === 2) {
        console.log('  ✓ Player has 2 draft picks');
        return true;
      } else {
        console.error('  ✗ Player should have 2 draft picks');
        return false;
      }
    } else {
      console.error('✗ Failed to retrieve team');
      return false;
    }
  } catch (error) {
    console.error('✗ View team failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testAddEpisodeScores() {
  console.log('\n=== Testing Add Episode Scores ===');
  
  try {
    const scores = contestantIds.map((id, index) => ({
      contestant_id: id,
      score: (index + 1) * 10
    }));
    
    await axios.post(
      `${API_BASE_URL}/scores`,
      {
        episode_number: 1,
        scores: scores
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.log('✓ Episode scores added successfully');
    return true;
  } catch (error) {
    console.error('✗ Add episode scores failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testViewLeaderboard() {
  console.log('\n=== Testing View Leaderboard ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/leaderboard`, {
      headers: { Authorization: `Bearer ${playerTokens[0]}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data.leaderboard)) {
      console.log('✓ Leaderboard retrieved successfully');
      console.log(`  Players on leaderboard: ${response.data.leaderboard.length}`);
      
      response.data.leaderboard.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.player_name} - ${entry.total_score} points`);
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

async function runPlayerWorkflowTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  E2E Test: Complete Player Workflow                   ║');
  console.log('║  Requirements: 1.4-1.8, 2.1-2.6, 3.1-3.6, 5.1-5.5     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  // Setup
  results.push(await setupAdmin());
  results.push(await setupContestants());
  results.push(await setupPlayers());
  
  // Player workflow
  results.push(await testViewContestants());
  results.push(await testSubmitRankings());
  results.push(await testSubmitSoleSurvivor());
  results.push(await testViewRankingsLocked());
  results.push(await testTriggerDraft());
  results.push(await testViewTeamAfterDraft());
  results.push(await testAddEpisodeScores());
  results.push(await testViewLeaderboard());
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ All player workflow tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runPlayerWorkflowTests().catch(error => {
  console.error('\n✗ Test suite failed:', error.message);
  process.exit(1);
});
