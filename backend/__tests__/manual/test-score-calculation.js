/**
 * Test script for Score Calculation Service
 * Tests the core calculation methods
 */

const scoreCalculationService = require('./services/scoreCalculationService');

async function testScoreCalculationService() {
  console.log('=== Testing Score Calculation Service ===\n');

  try {
    // Test 1: Calculate episode score (will return 0 if no events exist)
    console.log('Test 1: Calculate Episode Score');
    try {
      const episodeScore = await scoreCalculationService.calculateEpisodeScore(1, 1);
      console.log(`✓ Episode score calculated: ${episodeScore}`);
    } catch (error) {
      console.log(`✗ Episode score calculation failed: ${error.message}`);
    }

    // Test 2: Update contestant total score
    console.log('\nTest 2: Update Contestant Total Score');
    try {
      const totalScore = await scoreCalculationService.updateContestantTotalScore(1);
      console.log(`✓ Contestant total score updated: ${totalScore}`);
    } catch (error) {
      console.log(`✗ Contestant total score update failed: ${error.message}`);
    }

    // Test 3: Calculate sole survivor bonus
    console.log('\nTest 3: Calculate Sole Survivor Bonus');
    try {
      const bonus = await scoreCalculationService.calculateSoleSurvivorBonus(1);
      console.log(`✓ Sole survivor bonus calculated:`);
      console.log(`  - Episode count: ${bonus.episodeCount}`);
      console.log(`  - Episode bonus: ${bonus.episodeBonus}`);
      console.log(`  - Winner bonus: ${bonus.winnerBonus}`);
      console.log(`  - Total bonus: ${bonus.totalBonus}`);
    } catch (error) {
      console.log(`✗ Sole survivor bonus calculation failed: ${error.message}`);
    }

    // Test 4: Calculate player score
    console.log('\nTest 4: Calculate Player Score');
    try {
      const playerScore = await scoreCalculationService.calculatePlayerScore(1);
      console.log(`✓ Player score calculated:`);
      console.log(`  - Draft score: ${playerScore.draft_score}`);
      console.log(`  - Sole survivor score: ${playerScore.sole_survivor_score}`);
      console.log(`  - Sole survivor bonus: ${playerScore.sole_survivor_bonus}`);
      console.log(`  - Total: ${playerScore.total}`);
    } catch (error) {
      console.log(`✗ Player score calculation failed: ${error.message}`);
    }

    console.log('\n=== All Tests Complete ===');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Run tests
testScoreCalculationService()
  .then(() => {
    console.log('\nTest script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

