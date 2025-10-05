const supabase = require('../db/supabase');

/**
 * Check if all players have submitted their rankings
 * @returns {Promise<{allSubmitted: boolean, totalPlayers: number, submittedCount: number}>}
 */
async function checkAllRankingsSubmitted() {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, has_submitted_rankings');

  if (error) {
    throw new Error(`Failed to fetch players: ${error.message}`);
  }

  const totalPlayers = players.length;
  const submittedCount = players.filter(p => p.has_submitted_rankings).length;

  return {
    allSubmitted: totalPlayers > 0 && submittedCount === totalPlayers,
    totalPlayers,
    submittedCount
  };
}

/**
 * Get detailed player ranking submission status
 * @returns {Promise<{players: Array, totalPlayers: number, submittedCount: number}>}
 */
async function getPlayerRankingStatus() {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, email, has_submitted_rankings')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch players: ${error.message}`);
  }

  const totalPlayers = players.length;
  const submittedCount = players.filter(p => p.has_submitted_rankings).length;

  return {
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      hasSubmitted: p.has_submitted_rankings
    })),
    totalPlayers,
    submittedCount
  };
}

/**
 * Execute snake draft algorithm
 * Assigns 2 contestants per player based on their rankings
 * Uses draft_status table to prevent duplicate drafts (transaction-like behavior)
 * @returns {Promise<Array>} Array of draft picks
 */
async function executeDraft() {
  // Check and update draft status atomically to prevent race conditions
  // This acts as a transaction lock
  const { data: statusData, error: statusError } = await supabase
    .from('draft_status')
    .select('is_complete')
    .eq('id', 1)
    .single();

  if (statusError) {
    throw new Error(`Failed to check draft status: ${statusError.message}`);
  }

  if (statusData.is_complete) {
    throw new Error('Draft has already been completed');
  }

  // Attempt to mark draft as complete (atomic operation)
  const { data: updateData, error: updateError } = await supabase
    .from('draft_status')
    .update({ is_complete: true, completed_at: new Date().toISOString() })
    .eq('id', 1)
    .eq('is_complete', false) // Only update if still false (prevents race condition)
    .select();

  if (updateError) {
    throw new Error(`Failed to update draft status: ${updateError.message}`);
  }

  // If no rows were updated, another request already started the draft
  if (!updateData || updateData.length === 0) {
    throw new Error('Draft has already been completed');
  }

  try {
    // Verify all players have submitted rankings
    const rankingStatus = await checkAllRankingsSubmitted();
    if (!rankingStatus.allSubmitted) {
      // Rollback draft status if validation fails
      await supabase
        .from('draft_status')
        .update({ is_complete: false, completed_at: null })
        .eq('id', 1);
      
      throw new Error(
        `Not all players have submitted rankings. ${rankingStatus.submittedCount}/${rankingStatus.totalPlayers} submitted.`
      );
    }

  // Get all players with their sole survivor picks
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, sole_survivor_id')
    .order('id', { ascending: true });

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  if (players.length === 0) {
    throw new Error('No players found');
  }

  // Randomize player order for fair draft
  // Fisher-Yates shuffle algorithm
  const shufflePlayers = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const randomizedPlayers = shufflePlayers(players);
  console.log('Draft order:', randomizedPlayers.map(p => p.name).join(', '));

  // Get all rankings for all players
  const { data: rankings, error: rankingsError } = await supabase
    .from('rankings')
    .select('player_id, contestant_id, rank')
    .order('player_id', { ascending: true })
    .order('rank', { ascending: true });

  if (rankingsError) {
    throw new Error(`Failed to fetch rankings: ${rankingsError.message}`);
  }

  // Organize rankings by player, excluding their sole survivor pick
  const playerRankings = {};
  players.forEach(player => {
    playerRankings[player.id] = rankings
      .filter(r => r.player_id === player.id)
      .filter(r => r.contestant_id !== player.sole_survivor_id) // Exclude sole survivor
      .map(r => r.contestant_id);
  });

  // Execute snake draft
  const draftPicks = [];
  const assignedContestants = new Set();
  const picksPerPlayer = 2;
  const totalRounds = picksPerPlayer;

  for (let round = 0; round < totalRounds; round++) {
    // Determine pick order for this round (snake draft)
    const pickOrder = round % 2 === 0 
      ? [...randomizedPlayers] // Forward order for even rounds (0, 2, 4...)
      : [...randomizedPlayers].reverse(); // Reverse order for odd rounds (1, 3, 5...)

    for (const player of pickOrder) {
      const playerRanking = playerRankings[player.id];
      
      // Find highest-ranked contestant not yet picked
      let selectedContestant = null;
      for (const contestantId of playerRanking) {
        if (!assignedContestants.has(contestantId)) {
          selectedContestant = contestantId;
          break;
        }
      }

      if (!selectedContestant) {
        throw new Error(`No available contestants for player ${player.name}`);
      }

      // Record the pick
      assignedContestants.add(selectedContestant);
      draftPicks.push({
        player_id: player.id,
        contestant_id: selectedContestant,
        pick_number: draftPicks.length + 1
      });
    }
  }

    // Save draft picks to database
    const { data: savedPicks, error: saveError } = await supabase
      .from('draft_picks')
      .insert(draftPicks)
      .select();

    if (saveError) {
      // Rollback draft status if save fails
      await supabase
        .from('draft_status')
        .update({ is_complete: false, completed_at: null })
        .eq('id', 1);
      
      throw new Error(`Failed to save draft picks: ${saveError.message}`);
    }

    return savedPicks;
  } catch (error) {
    // If any error occurs during draft execution, rollback the status
    // (unless it's already been rolled back)
    if (!error.message.includes('Not all players have submitted')) {
      await supabase
        .from('draft_status')
        .update({ is_complete: false, completed_at: null })
        .eq('id', 1);
    }
    throw error;
  }
}

/**
 * Check if draft has been completed
 * @returns {Promise<{isComplete: boolean, pickCount: number, completedAt: string|null}>}
 */
async function checkDraftStatus() {
  // Check draft_status table for authoritative status
  const { data: statusData, error: statusError } = await supabase
    .from('draft_status')
    .select('is_complete, completed_at')
    .eq('id', 1)
    .maybeSingle();

  // If no row exists, initialize it
  if (!statusData) {
    const { error: insertError } = await supabase
      .from('draft_status')
      .insert({ id: 1, is_complete: false, completed_at: null });
    
    if (insertError && !insertError.message.includes('duplicate')) {
      throw new Error(`Failed to initialize draft status: ${insertError.message}`);
    }
    
    // Return default status
    return {
      isComplete: false,
      pickCount: 0,
      completedAt: null
    };
  }

  if (statusError) {
    throw new Error(`Failed to check draft status: ${statusError.message}`);
  }

  // Also get pick count for additional info
  const { data: picks, error: pickError } = await supabase
    .from('draft_picks')
    .select('id');

  if (pickError) {
    throw new Error(`Failed to count draft picks: ${pickError.message}`);
  }

  return {
    isComplete: statusData.is_complete,
    pickCount: picks ? picks.length : 0,
    completedAt: statusData.completed_at
  };
}

/**
 * Replace eliminated draft picks with next highest-ranked available contestants
 * @param {number} eliminatedContestantId - ID of the eliminated contestant
 * @returns {Promise<Array>} Array of replacement actions performed
 */
async function replaceEliminatedDraftPicks(eliminatedContestantId) {
  const replacements = [];

  try {
    // Find all players who have this contestant as a draft pick
    const { data: affectedPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select('id, player_id, contestant_id')
      .eq('contestant_id', eliminatedContestantId);

    if (picksError) {
      throw new Error(`Failed to find affected draft picks: ${picksError.message}`);
    }

    // If no players have this contestant as a draft pick, nothing to do
    if (!affectedPicks || affectedPicks.length === 0) {
      console.log(`No draft picks found for eliminated contestant ${eliminatedContestantId}`);
      return replacements;
    }

    // Process each affected player
    for (const pick of affectedPicks) {
      const playerId = pick.player_id;

      // Get player's sole survivor
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('sole_survivor_id, name')
        .eq('id', playerId)
        .single();

      if (playerError) {
        console.error(`Failed to fetch player ${playerId}:`, playerError);
        continue;
      }

      // Get player's rankings
      const { data: rankings, error: rankingsError } = await supabase
        .from('rankings')
        .select('contestant_id, rank')
        .eq('player_id', playerId)
        .order('rank', { ascending: true });

      if (rankingsError) {
        console.error(`Failed to fetch rankings for player ${playerId}:`, rankingsError);
        continue;
      }

      // Get player's current draft picks
      const { data: currentPicks, error: currentPicksError } = await supabase
        .from('draft_picks')
        .select('contestant_id')
        .eq('player_id', playerId);

      if (currentPicksError) {
        console.error(`Failed to fetch current picks for player ${playerId}:`, currentPicksError);
        continue;
      }

      // Build set of already assigned contestants (excluding the eliminated one)
      const assignedContestants = new Set(
        currentPicks
          .map(p => p.contestant_id)
          .filter(id => id !== eliminatedContestantId)
      );

      // Add sole survivor to exclusion list
      if (player.sole_survivor_id) {
        assignedContestants.add(player.sole_survivor_id);
      }

      // Find highest-ranked unassigned contestant
      let replacementContestant = null;
      for (const ranking of rankings) {
        if (!assignedContestants.has(ranking.contestant_id)) {
          replacementContestant = ranking.contestant_id;
          break;
        }
      }

      if (!replacementContestant) {
        console.error(`No available replacement contestant for player ${playerId}`);
        continue;
      }

      // Update the draft pick with the replacement contestant
      const { data: updatedPick, error: updateError } = await supabase
        .from('draft_picks')
        .update({ contestant_id: replacementContestant })
        .eq('id', pick.id)
        .select()
        .single();

      if (updateError) {
        console.error(`Failed to update draft pick for player ${playerId}:`, updateError);
        continue;
      }

      // Log the replacement
      const replacementInfo = {
        playerId,
        playerName: player.name,
        eliminatedContestantId,
        replacementContestantId: replacementContestant,
        pickId: pick.id
      };

      console.log('Draft pick replacement:', replacementInfo);
      replacements.push(replacementInfo);
    }

    return replacements;
  } catch (error) {
    console.error('Error in replaceEliminatedDraftPicks:', error);
    throw error;
  }
}

module.exports = {
  checkAllRankingsSubmitted,
  getPlayerRankingStatus,
  executeDraft,
  checkDraftStatus,
  replaceEliminatedDraftPicks
};
