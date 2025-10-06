/**
 * Test script for automatic draft pick replacement when contestant is eliminated
 * 
 * This script tests the requirement 2.10:
 * "IF a draft pick is eliminated THEN the system SHALL assign a new draft pick 
 * based on the player's ranking order, selecting the highest-ranked contestant 
 * not yet assigned to that player AND not the sole survivor pick"
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test credentials
const adminCredentials = {
  email: 'admin@test.com',
  password: 'admin123'
};

let adminToken = '';

/**
 * Login as admin
 */
async function loginAsAdmin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, adminCredentials);
    adminToken = response.data.token;
    console.log('✓ Logged in as admin');
    return adminToken;
  } catch (error) {
    console.error('✗ Failed to login as admin:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all contestants
 */
async function getContestants() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/contestants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ Retrieved ${response.data.length} contestants`);
    return response.data;
  } catch (error) {
    console.error('✗ Failed to get contestants:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get draft picks for a player
 */
async function getDraftPicks(playerId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/players/${playerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return response.data.draft_picks || [];
  } catch (error) {
    console.error(`✗ Failed to get draft picks for player ${playerId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all players
 */
async function getPlayers() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/players`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ Retrieved ${response.data.length} players`);
    return response.data;
  } catch (error) {
    console.error('✗ Failed to get players:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mark contestant as eliminated
 */
async function eliminateContestant(contestantId) {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/contestants/${contestantId}`,
      { is_eliminated: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✓ Marked contestant ${contestantId} as eliminated`);
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to eliminate contestant ${contestantId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n=== Testing Automatic Draft Pick Replacement ===\n');

  try {
    // Step 1: Login as admin
    await loginAsAdmin();

    // Step 2: Get all contestants
    const contestants = await getContestants();
    
    if (contestants.length === 0) {
      console.log('⚠ No contestants found. Please run the draft first.');
      return;
    }

    // Step 3: Get all players
    const players = await getPlayers();
    
    if (players.length === 0) {
      console.log('⚠ No players found.');
      return;
    }

    // Step 4: Find a contestant that is a draft pick (not eliminated)
    let targetContestant = null;
    let affectedPlayers = [];

    for (const player of players) {
      const draftPicks = await getDraftPicks(player.id);
      
      for (const pick of draftPicks) {
        const contestant = contestants.find(c => c.id === pick.contestant_id);
        if (contestant && !contestant.is_eliminated) {
          targetContestant = contestant;
          affectedPlayers.push({
            player,
            draftPicks,
            eliminatedPick: pick
          });
          break;
        }
      }
      
      if (targetContestant) break;
    }

    if (!targetContestant) {
      console.log('⚠ No suitable contestant found to eliminate (all draft picks already eliminated)');
      return;
    }

    console.log(`\n📋 Test Setup:`);
    console.log(`   Target contestant: ${targetContestant.name} (ID: ${targetContestant.id})`);
    console.log(`   Affected players: ${affectedPlayers.length}`);
    
    for (const { player, eliminatedPick } of affectedPlayers) {
      console.log(`   - ${player.name} (ID: ${player.id}) has ${targetContestant.name} as draft pick`);
    }

    // Step 5: Get draft picks before elimination
    console.log(`\n📊 Draft Picks Before Elimination:`);
    const beforePicks = {};
    for (const { player } of affectedPlayers) {
      const picks = await getDraftPicks(player.id);
      beforePicks[player.id] = picks;
      console.log(`   ${player.name}: ${picks.map(p => `Contestant ${p.contestant_id}`).join(', ')}`);
    }

    // Step 6: Eliminate the contestant
    console.log(`\n🎯 Eliminating contestant ${targetContestant.name}...`);
    const eliminationResult = await eliminateContestant(targetContestant.id);
    
    if (eliminationResult.replacements && eliminationResult.replacements.length > 0) {
      console.log(`✓ Automatic replacements triggered:`);
      for (const replacement of eliminationResult.replacements) {
        console.log(`   - ${replacement.playerName}: New contestant ID ${replacement.newContestantId}`);
      }
    }

    // Step 7: Verify draft picks after elimination
    console.log(`\n📊 Draft Picks After Elimination:`);
    let allReplacementsSuccessful = true;
    
    for (const { player } of affectedPlayers) {
      const afterPicks = await getDraftPicks(player.id);
      console.log(`   ${player.name}: ${afterPicks.map(p => `Contestant ${p.contestant_id}`).join(', ')}`);
      
      // Verify the eliminated contestant is no longer in draft picks
      const hasEliminatedContestant = afterPicks.some(p => p.contestant_id === targetContestant.id);
      if (hasEliminatedContestant) {
        console.error(`   ✗ ERROR: Player ${player.name} still has eliminated contestant ${targetContestant.id}`);
        allReplacementsSuccessful = false;
      } else {
        console.log(`   ✓ Eliminated contestant removed from ${player.name}'s draft picks`);
      }
      
      // Verify player still has 2 draft picks
      if (afterPicks.length !== 2) {
        console.error(`   ✗ ERROR: Player ${player.name} has ${afterPicks.length} draft picks (expected 2)`);
        allReplacementsSuccessful = false;
      } else {
        console.log(`   ✓ Player ${player.name} still has 2 draft picks`);
      }
      
      // Verify new contestant is different from before
      const beforeIds = beforePicks[player.id].map(p => p.contestant_id).sort();
      const afterIds = afterPicks.map(p => p.contestant_id).sort();
      const isDifferent = JSON.stringify(beforeIds) !== JSON.stringify(afterIds);
      
      if (isDifferent) {
        const newContestantId = afterIds.find(id => !beforeIds.includes(id));
        console.log(`   ✓ New contestant assigned: ID ${newContestantId}`);
      } else {
        console.error(`   ✗ ERROR: Draft picks unchanged for ${player.name}`);
        allReplacementsSuccessful = false;
      }
    }

    // Final result
    console.log(`\n${'='.repeat(50)}`);
    if (allReplacementsSuccessful) {
      console.log('✅ TEST PASSED: Automatic draft pick replacement working correctly!');
    } else {
      console.log('❌ TEST FAILED: Some replacements did not work as expected');
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
runTest();
