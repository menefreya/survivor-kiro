const supabase = require('../db/supabase');
const ScoreCalculationService = require('../services/scoreCalculationService');

/**
 * Get team details for a specific episode
 * @route GET /api/team-details/:episodeId?playerId=123
 * @access Protected
 */
async function getTeamDetailsForEpisode(req, res) {
  try {
    const { episodeId } = req.params;
    const { playerId: targetPlayerId } = req.query;

    // Determine which player's data to fetch
    let playerId = req.user.id;
    if (targetPlayerId) {
      playerId = parseInt(targetPlayerId);
    }

    // Validate episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, aired_date')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Get all episodes to map IDs to numbers
    const { data: allEpisodes, error: allEpisodesError } = await supabase
      .from('episodes')
      .select('id, episode_number')
      .order('episode_number');

    if (allEpisodesError) {
      console.error('Error fetching all episodes:', allEpisodesError);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    // Get all draft picks for this player
    const { data: allDraftPicks, error: draftError } = await supabase
      .from('draft_picks')
      .select(`
        contestant_id,
        start_episode,
        end_episode,
        is_replacement,
        contestants:contestant_id (
          id,
          name,
          profession,
          image_url,
          tribe,
          is_eliminated
        )
      `)
      .eq('player_id', playerId);

    if (draftError) {
      console.error('Error fetching draft picks:', draftError);
      return res.status(500).json({ error: 'Failed to fetch team data' });
    }

    // Filter draft picks that were active during this episode
    const draftPicks = (allDraftPicks || []).filter(pick => {
      const startEpisode = allEpisodes.find(ep => ep.id === pick.start_episode);
      if (!startEpisode) {
        console.error(`Draft pick start episode not found: pick ID ${pick.id}, start_episode ${pick.start_episode}`);
        console.error(`Available episodes:`, allEpisodes.map(ep => `ID ${ep.id} = Episode ${ep.episode_number}`));
        return false; // Skip this pick as we can't determine when it's active
      }
      const startEpisodeNumber = startEpisode.episode_number;

      let endEpisodeNumber = null;
      if (pick.end_episode !== null) {
        const endEpisode = allEpisodes.find(ep => ep.id === pick.end_episode);
        if (!endEpisode) {
          console.error(`Draft pick end episode not found: pick ID ${pick.id}, end_episode ${pick.end_episode}`);
          return false; // Skip this pick as we can't determine when it ends
        }
        endEpisodeNumber = endEpisode.episode_number;
      }

      return startEpisodeNumber <= episode.episode_number &&
             (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);
    });

    // Get all sole survivor history for this player
    const { data: allSoleSurvivorHistory, error: historyError } = await supabase
      .from('sole_survivor_history')
      .select(`
        contestant_id,
        start_episode,
        end_episode,
        contestants:contestant_id (
          id,
          name,
          profession,
          image_url,
          tribe,
          is_eliminated
        )
      `)
      .eq('player_id', playerId)
      .order('start_episode', { ascending: false });

    if (historyError) {
      console.error('Error fetching sole survivor history:', historyError);
      return res.status(500).json({ error: 'Failed to fetch sole survivor history' });
    }

    // Find sole survivor active during this episode
    const soleSurvivorHistory = (allSoleSurvivorHistory || []).filter(h => {
      const startEpisode = allEpisodes.find(ep => ep.id === h.start_episode);
      if (!startEpisode) {
        console.error(`Sole survivor start episode not found: history ID ${h.id}, start_episode ${h.start_episode}`);
        console.error(`Available episodes:`, allEpisodes.map(ep => `ID ${ep.id} = Episode ${ep.episode_number}`));
        return false; // Skip this history as we can't determine when it's active
      }
      const startEpisodeNumber = startEpisode.episode_number;

      let endEpisodeNumber = null;
      if (h.end_episode !== null) {
        const endEpisode = allEpisodes.find(ep => ep.id === h.end_episode);
        if (!endEpisode) {
          console.error(`Sole survivor end episode not found: history ID ${h.id}, end_episode ${h.end_episode}`);
          return false; // Skip this history as we can't determine when it ends
        }
        endEpisodeNumber = endEpisode.episode_number;
      }

      return startEpisodeNumber <= episode.episode_number &&
             (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);
    });

    if (historyError) {
      console.error('Error fetching sole survivor history:', historyError);
      return res.status(500).json({ error: 'Failed to fetch sole survivor history' });
    }

    // Get the active sole survivor for this episode
    const activeSoleSurvivor = soleSurvivorHistory && soleSurvivorHistory.length > 0 
      ? soleSurvivorHistory[0] 
      : null;

    // Get episode scores for all team members
    const teamContestantIds = [
      ...(draftPicks || []).map(pick => pick.contestant_id),
      ...(activeSoleSurvivor ? [activeSoleSurvivor.contestant_id] : [])
    ].filter(Boolean);

    let episodeScores = [];
    let episodeEvents = [];
    
    if (teamContestantIds.length > 0) {
      const { data: scores, error: scoresError } = await supabase
        .from('episode_scores')
        .select('contestant_id, score')
        .eq('episode_id', episodeId)
        .in('contestant_id', teamContestantIds);

      if (scoresError) {
        console.error('Error fetching episode scores:', scoresError);
        return res.status(500).json({ error: 'Failed to fetch episode scores' });
      }
      
      episodeScores = scores || [];

      // Get episode events separately
      const { data: events, error: eventsError } = await supabase
        .from('contestant_events')
        .select(`
          contestant_id, 
          point_value,
          event_types:event_type_id (
            name,
            display_name,
            category
          )
        `)
        .eq('episode_id', episodeId)
        .in('contestant_id', teamContestantIds);

      if (eventsError) {
        console.error('Error fetching episode events:', eventsError);
      } else {
        episodeEvents = events || [];
      }
    }



    // Get actual eliminations for this episode
    const { data: actualEliminations, error: eliminationsError } = await supabase
      .from('contestant_events')
      .select(`
        contestant_id,
        contestants:contestant_id (
          name,
          current_tribe
        )
      `)
      .eq('episode_id', episodeId)
      .in('event_type_id', [10, 29]); // 10 = eliminated, 29 = eliminated_medical

    if (eliminationsError) {
      console.error('Error fetching eliminations:', eliminationsError);
    }

    // Get player's predictions for this episode
    const { data: playerPredictions, error: predictionError } = await supabase
      .from('elimination_predictions')
      .select(`
        tribe,
        contestant_id,
        contestants:contestant_id (
          name
        )
      `)
      .eq('player_id', playerId)
      .eq('episode_id', episodeId);

    if (predictionError) {
      console.error('Error fetching predictions:', predictionError);
    }

    // Match predictions with actual eliminations to find correct ones
    const correctPredictions = [];
    if (playerPredictions && actualEliminations) {
      for (const elimination of actualEliminations) {
        const matchingPrediction = playerPredictions.find(pred => 
          pred.contestant_id === elimination.contestant_id &&
          pred.tribe === elimination.contestants?.current_tribe
        );
        
        if (matchingPrediction) {
          correctPredictions.push({
            tribe: matchingPrediction.tribe,
            contestant_name: elimination.contestants?.name || 'Unknown',
            points: 3
          });
        }
      }
    }

    if (predictionError) {
      console.error('Error fetching prediction bonuses:', predictionError);
    }

    // Build team details with scores
    const draftedContestants = (draftPicks || []).map(pick => {
      const contestant = pick.contestants;
      if (!contestant) return null;
      
      const scoreData = episodeScores?.find(s => s.contestant_id === contestant.id);
      const events = episodeEvents?.filter(e => e.contestant_id === contestant.id) || [];
      
      // Transform events to match frontend expectations
      const transformedEvents = events.map(event => ({
        event_type: event.event_types?.name || 'unknown',
        points: event.point_value || 0,
        description: event.event_types?.display_name || event.event_types?.name || 'Event'
      }));
      
      return {
        ...contestant,
        episode_score: scoreData?.score || 0,
        events: transformedEvents,
        pick_type: 'draft',
        is_replacement: pick.is_replacement
      };
    }).filter(Boolean);

    let soleSurvivor = null;
    if (activeSoleSurvivor && activeSoleSurvivor.contestants) {
      const scoreData = episodeScores?.find(s => s.contestant_id === activeSoleSurvivor.contestants.id);
      const events = episodeEvents?.filter(e => e.contestant_id === activeSoleSurvivor.contestants.id) || [];
      
      // Transform events to match frontend expectations
      const transformedEvents = events.map(event => ({
        event_type: event.event_types?.name || 'unknown',
        points: event.point_value || 0,
        description: event.event_types?.display_name || event.event_types?.name || 'Event'
      }));
      
      soleSurvivor = {
        ...activeSoleSurvivor.contestants,
        episode_score: scoreData?.score || 0,
        events: transformedEvents,
        pick_type: 'sole_survivor',
        // Add history info to show when this contestant was active
        active_period: {
          start_episode: activeSoleSurvivor.start_episode,
          end_episode: activeSoleSurvivor.end_episode
        }
      };
    }

    // Calculate totals
    const draftScore = draftedContestants.reduce((sum, c) => sum + c.episode_score, 0);
    const soleSurvivorScore = soleSurvivor ? soleSurvivor.episode_score : 0;
    const predictionBonus = correctPredictions.length * 3; // 3 points per correct prediction
    const totalEpisodeScore = draftScore + soleSurvivorScore + predictionBonus;

    res.json({
      episode,
      team: {
        drafted_contestants: draftedContestants,
        sole_survivor: soleSurvivor
      },
      scores: {
        draft_score: draftScore,
        sole_survivor_score: soleSurvivorScore,
        prediction_bonus: predictionBonus,
        total_episode_score: totalEpisodeScore
      },
      prediction_bonuses: correctPredictions.map(p => ({
        prediction_text: `${p.tribe} tribe elimination: ${p.contestant_name}`,
        points: p.points
      }))
    });

  } catch (error) {
    console.error('Error in getTeamDetailsForEpisode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all episodes with team summary
 * @route GET /api/team-details?playerId=123
 * @access Protected
 */
async function getAllEpisodesWithTeamSummary(req, res) {
  try {
    const { playerId: targetPlayerId } = req.query;

    // Determine which player's data to fetch
    let playerId = req.user.id;
    if (targetPlayerId) {
      playerId = parseInt(targetPlayerId);
    }

    // Get all episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, episode_number, aired_date')
      .order('episode_number', { ascending: true });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    // Get player's draft picks with episode ranges
    const { data: draftPicks, error: draftError } = await supabase
      .from('draft_picks')
      .select(`
        contestant_id,
        start_episode,
        end_episode,
        contestants:contestant_id (
          id,
          name,
          image_url
        )
      `)
      .eq('player_id', playerId);

    if (draftError) {
      console.error('Error fetching draft picks:', draftError);
      return res.status(500).json({ error: 'Failed to fetch team data' });
    }

    // Get all sole survivor history for this player
    const { data: allSoleSurvivorHistory, error: playerError } = await supabase
      .from('sole_survivor_history')
      .select(`
        contestant_id,
        start_episode,
        end_episode,
        contestants:contestant_id (
          id,
          name,
          image_url
        )
      `)
      .eq('player_id', playerId)
      .order('start_episode');

    if (playerError) {
      console.error('Error fetching sole survivor history:', playerError);
      return res.status(500).json({ error: 'Failed to fetch sole survivor history' });
    }

    // Get all episode scores for player's team
    const allSoleSurvivorIds = (allSoleSurvivorHistory || []).map(h => h.contestant_id);
    const allContestantIds = [
      ...(draftPicks || []).map(pick => pick.contestant_id),
      ...allSoleSurvivorIds
    ].filter(Boolean);

    let allEpisodeScores = [];
    if (allContestantIds.length > 0) {
      const { data: scores, error: allScoresError } = await supabase
        .from('episode_scores')
        .select('episode_id, contestant_id, score')
        .in('contestant_id', allContestantIds);

      if (allScoresError) {
        console.error('Error fetching all episode scores:', allScoresError);
        return res.status(500).json({ error: 'Failed to fetch episode scores' });
      }
      
      allEpisodeScores = scores || [];
    }

    // Get all correct prediction bonuses (already scored by the system)
    const { data: allPredictionBonuses, error: allPredictionError } = await supabase
      .from('elimination_predictions')
      .select('episode_id')
      .eq('player_id', playerId)
      .eq('is_correct', true);

    if (allPredictionError) {
      console.error('Error fetching prediction bonuses:', allPredictionError);
    }

    // Build episode summaries
    const episodeSummaries = (episodes || []).map(episode => {
      // Find active contestants for this episode
      const activeContestants = (draftPicks || []).filter(pick => {
        const startEpisode = episodes.find(ep => ep.id === pick.start_episode);
        const startEpisodeNumber = startEpisode ? startEpisode.episode_number : 1;

        let endEpisodeNumber = null;
        if (pick.end_episode !== null) {
          const endEpisode = episodes.find(ep => ep.id === pick.end_episode);
          endEpisodeNumber = endEpisode ? endEpisode.episode_number : null;
        }

        return startEpisodeNumber <= episode.episode_number &&
               (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);
      });

      // Find active sole survivor for this episode
      const activeSoleSurvivorForEpisode = (allSoleSurvivorHistory || []).find(h => {
        // start_episode and end_episode contain episode numbers, not IDs
        const startEpisodeNumber = h.start_episode || 1;
        const endEpisodeNumber = h.end_episode;

        return startEpisodeNumber <= episode.episode_number &&
               (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);
      });

      // Calculate scores for this episode
      const episodeScoreData = allEpisodeScores.filter(s => s.episode_id === episode.id);
      const draftScore = episodeScoreData
        .filter(s => activeContestants.some(c => c.contestant_id === s.contestant_id))
        .reduce((sum, s) => sum + s.score, 0);
      
      const soleSurvivorScore = activeSoleSurvivorForEpisode ? 
        (episodeScoreData.find(s => s.contestant_id === activeSoleSurvivorForEpisode.contestant_id)?.score || 0) : 0;

      const predictionBonus = allPredictionBonuses ? 
        allPredictionBonuses
          .filter(p => p.episode_id === episode.id)
          .length * 3 : 0; // 3 points per correct prediction

      const totalScore = draftScore + soleSurvivorScore + predictionBonus;

      return {
        ...episode,
        team_summary: {
          active_contestants: activeContestants.length + (activeSoleSurvivorForEpisode ? 1 : 0),
          draft_score: draftScore,
          sole_survivor_score: soleSurvivorScore,
          prediction_bonus: predictionBonus,
          total_score: totalScore
        }
      };
    });

    res.json({
      episodes: episodeSummaries,
      team_info: {
        drafted_contestants: (draftPicks || []).map(pick => pick.contestants).filter(Boolean),
        sole_survivor_history: (allSoleSurvivorHistory || []).map(h => ({
          ...h.contestants,
          start_episode: h.start_episode,
          end_episode: h.end_episode
        }))
      }
    });

  } catch (error) {
    console.error('Error in getAllEpisodesWithTeamSummary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all players
 * @route GET /api/team-details/players
 * @access Protected
 */
async function getAllPlayers(req, res) {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, email, profile_image_url')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    res.json({ players: players || [] });
  } catch (error) {
    console.error('Error in getAllPlayers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get detailed audit data for all episodes
 * @route GET /api/team-details/audit?playerId=123
 * @access Protected
 */
async function getTeamAuditData(req, res) {
  try {
    const { playerId: targetPlayerId } = req.query;

    // Determine which player's data to fetch
    let playerId = req.user.id;
    if (targetPlayerId) {
      playerId = parseInt(targetPlayerId);
    }

    console.log('=== getTeamAuditData called for playerId:', playerId);

    // Get all episodes
    const { data: allEpisodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, episode_number, aired_date, is_current')
      .order('episode_number', { ascending: true });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    // Show all episodes in descending order
    const episodes = allEpisodes.reverse();

    // Get player's draft picks with episode ranges
    const { data: draftPicks, error: draftError } = await supabase
      .from('draft_picks')
      .select(`
        contestant_id,
        replaced_contestant_id,
        start_episode,
        end_episode,
        is_replacement,
        contestants:contestant_id (
          id,
          name,
          image_url,
          is_eliminated
        ),
        replaced_contestants:replaced_contestant_id (
          id,
          name,
          image_url,
          is_eliminated
        )
      `)
      .eq('player_id', playerId);

    if (draftError) {
      console.error('Error fetching draft picks:', draftError);
      return res.status(500).json({ error: 'Failed to fetch team data' });
    }

    // Get sole survivor history
    const { data: soleSurvivorHistory, error: playerError } = await supabase
      .from('sole_survivor_history')
      .select(`
        contestant_id,
        start_episode,
        end_episode,
        contestants:contestant_id (
          id,
          name,
          image_url,
          is_eliminated
        )
      `)
      .eq('player_id', playerId)
      .order('start_episode');

    if (playerError) {
      console.error('Error fetching sole survivor history:', playerError);
      return res.status(500).json({ error: 'Failed to fetch sole survivor history' });
    }

    // Get all contestant IDs for this player
    const allSoleSurvivorIds = (soleSurvivorHistory || []).map(h => h.contestant_id);
    const allContestantIds = [
      ...(draftPicks || []).map(pick => pick.contestant_id),
      ...allSoleSurvivorIds
    ].filter(Boolean);

    // Get all episode scores and events for all episodes
    let allEpisodeScores = [];
    let allEpisodeEvents = [];
    
    if (allContestantIds.length > 0) {
      const { data: scores, error: scoresError } = await supabase
        .from('episode_scores')
        .select('episode_id, contestant_id, score')
        .in('contestant_id', allContestantIds);

      if (scoresError) {
        console.error('Error fetching all episode scores:', scoresError);
        return res.status(500).json({ error: 'Failed to fetch episode scores' });
      }
      
      allEpisodeScores = scores || [];

      // Get all events for all episodes
      const { data: events, error: eventsError } = await supabase
        .from('contestant_events')
        .select(`
          episode_id,
          contestant_id,
          point_value,
          event_type_id,
          event_types:event_type_id (
            name,
            display_name,
            category
          )
        `)
        .in('contestant_id', allContestantIds);

      if (eventsError) {
        console.error('Error fetching all episode events:', eventsError);
      } else {
        allEpisodeEvents = events || [];
      }
    }

    // Build a map of contestant_id -> elimination_episode_number
    const eliminationEpisodeMap = new Map();
    if (allEpisodeEvents.length > 0) {
      // Event type IDs for elimination: 10 = eliminated, 29 = eliminated_medical
      const eliminationEvents = allEpisodeEvents.filter(e =>
        e.event_type_id === 10 || e.event_type_id === 29
      );

      for (const event of eliminationEvents) {
        const episode = allEpisodes?.find(ep => ep.id === event.episode_id);
        if (episode) {
          eliminationEpisodeMap.set(event.contestant_id, episode.episode_number);
        }
      }
    }

    // Get all correct predictions for all episodes
    const { data: allPredictions, error: allPredictionsError } = await supabase
      .from('elimination_predictions')
      .select('episode_id')
      .eq('player_id', playerId)
      .eq('is_correct', true);

    if (allPredictionsError) {
      console.error('Error fetching all predictions:', allPredictionsError);
    }

    // Build detailed audit data for each episode
    const auditData = episodes.map(episode => {
      // Find contestants active this episode
      const activeContestants = (draftPicks || []).filter(pick => {
        const startEpisode = allEpisodes.find(ep => ep.id === pick.start_episode);
        const startEpisodeNumber = startEpisode ? startEpisode.episode_number : 1;

        let endEpisodeNumber = null;
        if (pick.end_episode !== null) {
          const endEpisode = allEpisodes.find(ep => ep.id === pick.end_episode);
          endEpisodeNumber = endEpisode ? endEpisode.episode_number : null;
        }

        const isActive = startEpisodeNumber <= episode.episode_number &&
               (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);

        // Debug logging for Kristina Mills
        if (playerId === 4 && pick.contestants?.name?.includes('Kristina') && episode.episode_number <= 3) {
          console.log(`\n=== AUDIT DEBUG: Episode ${episode.episode_number} ===`);
          console.log('Pick:', pick.contestants.name);
          console.log('start_episode (ID):', pick.start_episode);
          console.log('startEpisodeNumber:', startEpisodeNumber);
          console.log('end_episode (ID):', pick.end_episode);
          console.log('endEpisodeNumber:', endEpisodeNumber);
          console.log('episode.episode_number:', episode.episode_number);
          console.log('Check:', `${startEpisodeNumber} <= ${episode.episode_number} && (${endEpisodeNumber} === null || ${endEpisodeNumber} >= ${episode.episode_number})`);
          console.log('isActive:', isActive);
        }

        // Replacements appear starting from their start_episode (which is already set correctly in the DB)
        return isActive;
      });

      // Get episode scores and events for this episode
      const episodeScoreData = allEpisodeScores.filter(s => s.episode_id === episode.id);
      const episodeEventData = allEpisodeEvents.filter(e => e.episode_id === episode.id);

      // Build contestant data
      const draftedContestants = activeContestants.map(pick => {
        const contestant = pick.contestants;
        if (!contestant) return null;

        const scoreData = episodeScoreData.find(s => s.contestant_id === contestant.id);
        const events = episodeEventData.filter(e => e.contestant_id === contestant.id) || [];

        const transformedEvents = events.map(event => ({
          event_type: event.event_types?.name || 'unknown',
          points: event.point_value || 0,
          description: event.event_types?.display_name || event.event_types?.name || 'Event'
        }));

        // Determine contestant status based on actual elimination, not draft pick end_episode
        // end_episode can be set for other reasons (like being replaced in draft)
        let status = 'active';
        const eliminationEpisodeNumber = eliminationEpisodeMap.get(contestant.id);

        // Only show as eliminated if they were eliminated in this episode or earlier
        if (eliminationEpisodeNumber && episode.episode_number >= eliminationEpisodeNumber) {
          status = 'eliminated';
        }

        return {
          ...contestant,
          episode_score: scoreData?.score || 0,
          events: transformedEvents,
          pick_type: 'draft',
          is_replacement: pick.replaced_contestant_id ? true : false,
          is_active_for_scoring: true, // All contestants in this list are active for scoring
          status: status,
          elimination_episode: eliminationEpisodeNumber
        };
      }).filter(Boolean);

      // Handle sole survivor - find who was active for this episode
      let soleSurvivor = null;
      const activeSoleSurvivorForEpisode = (soleSurvivorHistory || []).find(h => {
        // start_episode and end_episode contain episode numbers, not IDs
        const startEpisodeNumber = h.start_episode || 1;
        const endEpisodeNumber = h.end_episode;

        const isActive = startEpisodeNumber <= episode.episode_number &&
               (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);

        // Debug logging for player 3
        if (playerId === 3 && episode.episode_number >= 4 && episode.episode_number <= 7) {
          console.log(`\n=== Episode ${episode.episode_number} - Sole Survivor Check ===`);
          console.log(`Contestant: ${h.contestants?.name}`);
          console.log(`start_episode: ${startEpisodeNumber}, end_episode: ${endEpisodeNumber}`);
          console.log(`Check: ${startEpisodeNumber} <= ${episode.episode_number} && (${endEpisodeNumber} === null || ${endEpisodeNumber} >= ${episode.episode_number})`);
          console.log(`isActive: ${isActive}`);
        }

        return isActive;
      });

      // Debug logging for player 4
      if (playerId === 4 && episode.episode_number <= 3) {
        const kristina = draftedContestants.find(c => c.name?.includes('Kristina'));
        console.log(`Episode ${episode.episode_number}: Kristina in draftedContestants?`, !!kristina);
      }

      if (activeSoleSurvivorForEpisode && activeSoleSurvivorForEpisode.contestants) {
        const scoreData = episodeScoreData.find(s => s.contestant_id === activeSoleSurvivorForEpisode.contestants.id);
        const events = episodeEventData.filter(e => e.contestant_id === activeSoleSurvivorForEpisode.contestants.id) || [];
        
        const transformedEvents = events.map(event => ({
          event_type: event.event_types?.name || 'unknown',
          points: event.point_value || 0,
          description: event.event_types?.display_name || event.event_types?.name || 'Event'
        }));

        // Determine status for sole survivor
        let ssStatus = 'active';
        const ssEliminationEpisodeNumber = eliminationEpisodeMap.get(activeSoleSurvivorForEpisode.contestants.id);

        // Only show as eliminated if they were eliminated in this episode or earlier
        if (ssEliminationEpisodeNumber && episode.episode_number >= ssEliminationEpisodeNumber) {
          ssStatus = 'eliminated';
        }

        soleSurvivor = {
          ...activeSoleSurvivorForEpisode.contestants,
          episode_score: scoreData?.score || 0,
          events: transformedEvents,
          pick_type: 'sole_survivor',
          status: ssStatus,
          elimination_episode: ssEliminationEpisodeNumber,
          // Add history info to show when this contestant was active
          active_period: {
            start_episode: activeSoleSurvivorForEpisode.start_episode,
            end_episode: activeSoleSurvivorForEpisode.end_episode
          }
        };
      }

      // Calculate scores - only count contestants who are active for scoring
      const draftScore = draftedContestants
        .filter(c => c.is_active_for_scoring)
        .reduce((sum, c) => sum + c.episode_score, 0);
      const soleSurvivorScore = soleSurvivor ? soleSurvivor.episode_score : 0;
      const predictionBonus = allPredictions ? 
        allPredictions.filter(p => p.episode_id === episode.id).length * 3 : 0;
      const totalScore = draftScore + soleSurvivorScore + predictionBonus;

      return {
        episode: {
          id: episode.id,
          episode_number: episode.episode_number,
          aired_date: episode.aired_date
        },
        team: {
          drafted_contestants: draftedContestants,
          sole_survivor: soleSurvivor
        },
        scores: {
          draft_score: draftScore,
          sole_survivor_score: soleSurvivorScore,
          prediction_bonus: predictionBonus,
          total_episode_score: totalScore
        },
        prediction_bonuses: allPredictions ? 
          allPredictions
            .filter(p => p.episode_id === episode.id)
            .map(() => ({ prediction_text: 'Elimination prediction', points: 3 })) : []
      };
    });

    // Calculate overall totals using the same method as leaderboard
    let overallTotals = null;
    try {
      overallTotals = await ScoreCalculationService.calculatePlayerScore(playerId);
    } catch (error) {
      console.error('Error calculating overall totals:', error);
    }

    res.json({ 
      audit_data: auditData,
      overall_totals: overallTotals,
      team_info: {
        drafted_contestants: (draftPicks || []).map(pick => pick.contestants).filter(Boolean),
        sole_survivor_history: (soleSurvivorHistory || []).map(h => ({
          ...h.contestants,
          start_episode: h.start_episode,
          end_episode: h.end_episode
        }))
      }
    });

  } catch (error) {
    console.error('Error in getTeamAuditData:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getTeamDetailsForEpisode,
  getAllEpisodesWithTeamSummary,
  getAllPlayers,
  getTeamAuditData
};