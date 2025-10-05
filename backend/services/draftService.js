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

  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name')
    .order('id', { ascending: true });

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  if (players.length === 0) {
    throw new Error('No players found');
  }

  // Get all rankings for all players
  const { data: rankings, error: rankingsError } = await supabase
    .from('rankings')
    .select('player_id, contestant_id, rank')
    .order('player_id', { ascending: true })
    .order('rank', { ascending: true });

  if (rankingsError) {
    throw new Error(`Failed to fetch rankings: ${rankingsError.message}`);
  }

  // Organize rankings by player
  const playerRankings = {};
  players.forEach(player => {
    playerRankings[player.id] = rankings
      .filter(r => r.player_id === player.id)
      .map(r => r.contestant_id);
  });

  // Execute snake draft
  const draftPicks = [];
  const assignedContestants = new Set();
  const picksPerPlayer = 2;
  const totalRounds = picksPerPlayer;

  for (let round = 0; round < totalRounds; round++) {
    // Determine pick order for this round
    const pickOrder = round % 2 === 0 
      ? [...players] // Forward order for even rounds (0, 2, 4...)
      : [...players].reverse(); // Reverse order for odd rounds (1, 3, 5...)

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

module.exports = {
  checkAllRankingsSubmitted,
  executeDraft,
  checkDraftStatus
};
