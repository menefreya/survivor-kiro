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
        pick_number: draftPicks.length + 1,
        start_episode: 1, // Episode ID 1 (which should be episode number 1)
        end_episode: null,
        is_replacement: false
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
 * Replace a draft pick when player selects that contestant as sole survivor
 * @param {number} playerId - ID of the player
 * @param {number} contestantId - ID of the contestant being selected as sole survivor
 * @returns {Promise<Object|null>} Replacement action performed or null if no replacement needed
 */
async function replaceDraftPickForSoleSurvivor(playerId, contestantId) {
  try {
    // Check if this contestant is currently one of the player's active draft picks
    const { data: existingPick, error: pickError } = await supabase
      .from('draft_picks')
      .select('id, pick_number')
      .eq('player_id', playerId)
      .eq('contestant_id', contestantId)
      .is('end_episode', null) // Only active picks
      .single();

    if (pickError && pickError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check existing draft pick: ${pickError.message}`);
    }

    // If contestant is not a current draft pick, no replacement needed
    if (!existingPick) {
      return null;
    }

    // Get current episode for timing the replacement
    const { data: currentEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .eq('is_current', true)
      .single();

    const currentEpisodeId = currentEpisode?.id || 1;
    const currentEpisodeNumber = currentEpisode?.episode_number || 1;

    // Get player's rankings to find replacement
    const { data: rankings, error: rankingsError } = await supabase
      .from('rankings')
      .select('contestant_id, rank')
      .eq('player_id', playerId)
      .order('rank', { ascending: true });

    if (rankingsError) {
      throw new Error(`Failed to fetch player rankings: ${rankingsError.message}`);
    }

    // Get all currently assigned contestants (from all players)
    const { data: allDraftPicks, error: allPicksError } = await supabase
      .from('draft_picks')
      .select('contestant_id')
      .is('end_episode', null); // Only active picks

    if (allPicksError) {
      throw new Error(`Failed to fetch all draft picks: ${allPicksError.message}`);
    }

    // Build set of assigned contestants (excluding the one being moved to sole survivor)
    const assignedContestants = new Set(
      allDraftPicks
        .map(p => p.contestant_id)
        .filter(id => id !== contestantId)
    );

    // The contestant being selected as sole survivor will be excluded from draft picks
    assignedContestants.add(contestantId);

    // Also exclude eliminated contestants
    const { data: eliminatedContestants, error: eliminatedError } = await supabase
      .from('contestants')
      .select('id')
      .eq('is_eliminated', true);

    if (!eliminatedError && eliminatedContestants) {
      eliminatedContestants.forEach(contestant => {
        assignedContestants.add(contestant.id);
      });
    }

    // Find highest-ranked available replacement
    let replacementContestant = null;
    for (const ranking of rankings) {
      if (!assignedContestants.has(ranking.contestant_id)) {
        replacementContestant = ranking.contestant_id;
        break;
      }
    }

    if (!replacementContestant) {
      throw new Error(`No available replacement contestant found for player ${playerId}`);
    }

    // End the current draft pick at the current episode
    const { error: endError } = await supabase
      .from('draft_picks')
      .update({ end_episode: currentEpisodeId })
      .eq('id', existingPick.id);

    if (endError) {
      throw new Error(`Failed to end draft pick: ${endError.message}`);
    }

    // Find the next episode after the current episode
    const { data: nextEpisode, error: nextEpisodeError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .gt('episode_number', currentEpisodeNumber)
      .order('episode_number', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextEpisodeError) {
      throw new Error(`Failed to find next episode: ${nextEpisodeError.message}`);
    }

    if (!nextEpisode) {
      throw new Error(`No future episodes available for replacement draft pick`);
    }

    const nextEpisodeId = nextEpisode.id;

    // Create new draft pick for replacement contestant starting next episode
    const { data: newPick, error: insertError } = await supabase
      .from('draft_picks')
      .insert({
        player_id: playerId,
        contestant_id: replacementContestant,
        pick_number: existingPick.pick_number,
        start_episode: nextEpisodeId,
        end_episode: null,
        is_replacement: true,
        replaced_contestant_id: contestantId
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create replacement draft pick: ${insertError.message}`);
    }

    // Get contestant names for logging
    const { data: contestants, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name')
      .in('id', [contestantId, replacementContestant]);

    const originalContestant = contestants?.find(c => c.id === contestantId);
    const newContestant = contestants?.find(c => c.id === replacementContestant);

    const replacementInfo = {
      playerId,
      originalContestantId: contestantId,
      originalContestantName: originalContestant?.name,
      replacementContestantId: replacementContestant,
      replacementContestantName: newContestant?.name,
      oldPickId: existingPick.id,
      newPickId: newPick.id,
      episodeId: nextEpisodeId,
      episodeNumber: nextEpisode.episode_number,
      reason: 'sole_survivor_selection'
    };

    console.log('Draft pick replaced for sole survivor selection:', replacementInfo);
    return replacementInfo;

  } catch (error) {
    console.error('Error in replaceDraftPickForSoleSurvivor:', error);
    throw error;
  }
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

      // Get ALL draft picks from ALL players (not just this player)
      const { data: allDraftPicks, error: allPicksError } = await supabase
        .from('draft_picks')
        .select('contestant_id');

      if (allPicksError) {
        console.error(`Failed to fetch all draft picks:`, allPicksError);
        continue;
      }

      // Build set of ALL assigned contestants (excluding the eliminated one)
      const assignedContestants = new Set(
        allDraftPicks
          .map(p => p.contestant_id)
          .filter(id => id !== eliminatedContestantId)
      );

      // Exclude THIS player's sole survivor (can't have same contestant as both draft pick and sole survivor)
      if (player.sole_survivor_id) {
        assignedContestants.add(player.sole_survivor_id);
      }

      // Also exclude eliminated contestants
      const { data: eliminatedContestants, error: eliminatedError } = await supabase
        .from('contestants')
        .select('id')
        .eq('is_eliminated', true);

      if (!eliminatedError && eliminatedContestants) {
        eliminatedContestants.forEach(contestant => {
          assignedContestants.add(contestant.id);
        });
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
        console.log(`No available replacement contestant for player ${playerId}. Keeping eliminated contestant for compensation scoring.`);
        
        // Log that no replacement was found - the eliminated contestant stays for compensation
        const replacementInfo = {
          playerId,
          playerName: player.name,
          eliminatedContestantId,
          replacementContestantId: null, // No replacement found
          pickId: pick.id,
          compensationEligible: true
        };

        console.log('No replacement available - eligible for compensation:', replacementInfo);
        replacements.push(replacementInfo);
        continue;
      }

      // Find the episode where this contestant was eliminated (event_type_id 10 or 29)
      const { data: eliminationEvent, error: eliminationError } = await supabase
        .from('contestant_events')
        .select(`
          episode_id,
          episodes!episode_id(episode_number),
          event_type_id
        `)
        .eq('contestant_id', eliminatedContestantId)
        .in('event_type_id', [10, 29])  // 10 = eliminated, 29 = eliminated_medical
        .order('episodes.episode_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let eliminationEpisodeId;
      let nextEpisodeId = null;

      if (!eliminationError && eliminationEvent) {
        eliminationEpisodeId = eliminationEvent.episode_id;

        // Find the next episode after elimination
        const { data: nextEpisode } = await supabase
          .from('episodes')
          .select('id')
          .gt('episode_number', eliminationEvent.episodes.episode_number)
          .order('episode_number', { ascending: true })
          .limit(1)
          .maybeSingle();

        nextEpisodeId = nextEpisode?.id;
      } else {
        // Fallback: use current episode if no elimination event found
        const { data: currentEpisode } = await supabase
          .from('episodes')
          .select('id, episode_number')
          .eq('is_current', true)
          .maybeSingle();

        if (currentEpisode) {
          eliminationEpisodeId = currentEpisode.id;

          // Find next episode after current
          const { data: nextEpisode } = await supabase
            .from('episodes')
            .select('id')
            .gt('episode_number', currentEpisode.episode_number)
            .order('episode_number', { ascending: true })
            .limit(1)
            .maybeSingle();

          nextEpisodeId = nextEpisode?.id;
        } else {
          // Final fallback: use latest episode
          const { data: latestEpisode } = await supabase
            .from('episodes')
            .select('id, episode_number')
            .order('episode_number', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestEpisode) {
            eliminationEpisodeId = latestEpisode.id;

            // Find next episode after latest
            const { data: nextEpisode } = await supabase
              .from('episodes')
              .select('id')
              .gt('episode_number', latestEpisode.episode_number)
              .order('episode_number', { ascending: true })
              .limit(1)
              .maybeSingle();

            nextEpisodeId = nextEpisode?.id;
          } else {
            // Ultimate fallback - use episode ID 1
            eliminationEpisodeId = 1;
          }
        }
      }

      // First, end the current draft pick at the elimination episode
      const { error: endError } = await supabase
        .from('draft_picks')
        .update({ end_episode: eliminationEpisodeId })
        .eq('id', pick.id);

      if (endError) {
        console.error(`Failed to end draft pick for player ${playerId}:`, endError);
        continue;
      }

      // Only create replacement if we have a next episode to start from
      if (nextEpisodeId) {
        // Create new draft pick for replacement contestant starting next episode
        const { data: newPick, error: insertError } = await supabase
          .from('draft_picks')
          .insert({
            player_id: playerId,
            contestant_id: replacementContestant,
            pick_number: pick.pick_number || 0,
            start_episode: nextEpisodeId,
            end_episode: null,
            is_replacement: true,
            replaced_contestant_id: eliminatedContestantId
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to create replacement draft pick for player ${playerId}:`, insertError);
          continue;
        }
      } else {
        console.log(`No future episodes available for replacement contestant`);
      }

      if (insertError) {
        console.error(`Failed to create replacement draft pick for player ${playerId}:`, insertError);
        continue;
      }

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
        oldPickId: pick.id,
        newPickId: newPick?.id,
        endEpisodeId: eliminationEpisodeId,
        startEpisodeId: nextEpisodeId,
        compensationEligible: false
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
  replaceDraftPickForSoleSurvivor,
  replaceEliminatedDraftPicks
};
