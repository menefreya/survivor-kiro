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

    // Get player's draft picks that were active during this episode
    const { data: draftPicks, error: draftError } = await supabase
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
      .eq('player_id', playerId)
      .lte('start_episode', episode.episode_number)
      .or(`end_episode.is.null,end_episode.gte.${episode.episode_number}`);

    if (draftError) {
      console.error('Error fetching draft picks:', draftError);
      return res.status(500).json({ error: 'Failed to fetch team data' });
    }

    // Get player's sole survivor pick
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        sole_survivor_id,
        contestants:sole_survivor_id (
          id,
          name,
          profession,
          image_url,
          tribe,
          is_eliminated
        )
      `)
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player data:', playerError);
      return res.status(500).json({ error: 'Failed to fetch player data' });
    }

    // Get episode scores for all team members
    const teamContestantIds = [
      ...(draftPicks || []).map(pick => pick.contestant_id),
      ...(player.sole_survivor_id ? [player.sole_survivor_id] : [])
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
    if (player.contestants) {
      const scoreData = episodeScores?.find(s => s.contestant_id === player.contestants.id);
      const events = episodeEvents?.filter(e => e.contestant_id === player.contestants.id) || [];
      
      // Transform events to match frontend expectations
      const transformedEvents = events.map(event => ({
        event_type: event.event_types?.name || 'unknown',
        points: event.point_value || 0,
        description: event.event_types?.display_name || event.event_types?.name || 'Event'
      }));
      
      soleSurvivor = {
        ...player.contestants,
        episode_score: scoreData?.score || 0,
        events: transformedEvents,
        pick_type: 'sole_survivor'
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

    // Get sole survivor
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        sole_survivor_id,
        contestants:sole_survivor_id (
          id,
          name,
          image_url
        )
      `)
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player data:', playerError);
      return res.status(500).json({ error: 'Failed to fetch player data' });
    }

    // Get all episode scores for player's team
    const allContestantIds = [
      ...(draftPicks || []).map(pick => pick.contestant_id),
      ...(player.sole_survivor_id ? [player.sole_survivor_id] : [])
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
      const activeContestants = (draftPicks || []).filter(pick => 
        pick.start_episode <= episode.episode_number &&
        (pick.end_episode === null || pick.end_episode >= episode.episode_number)
      );

      // Calculate scores for this episode
      const episodeScoreData = allEpisodeScores.filter(s => s.episode_id === episode.id);
      const draftScore = episodeScoreData
        .filter(s => activeContestants.some(c => c.contestant_id === s.contestant_id))
        .reduce((sum, s) => sum + s.score, 0);
      
      const soleSurvivorScore = player.sole_survivor_id ? 
        (episodeScoreData.find(s => s.contestant_id === player.sole_survivor_id)?.score || 0) : 0;

      const predictionBonus = allPredictionBonuses ? 
        allPredictionBonuses
          .filter(p => p.episode_id === episode.id)
          .length * 3 : 0; // 3 points per correct prediction

      const totalScore = draftScore + soleSurvivorScore + predictionBonus;

      return {
        ...episode,
        team_summary: {
          active_contestants: activeContestants.length + (player.sole_survivor_id ? 1 : 0),
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
        sole_survivor: player?.contestants || null
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

    // Get sole survivor
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        sole_survivor_id,
        contestants:sole_survivor_id (
          id,
          name,
          image_url
        )
      `)
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player data:', playerError);
      return res.status(500).json({ error: 'Failed to fetch player data' });
    }

    // Get all contestant IDs for this player
    const allContestantIds = [
      ...(draftPicks || []).map(pick => pick.contestant_id),
      ...(player.sole_survivor_id ? [player.sole_survivor_id] : [])
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
        const startEpisode = episodes.find(ep => ep.id === pick.start_episode);
        const startEpisodeNumber = startEpisode ? startEpisode.episode_number : 1;

        let endEpisodeNumber = null;
        if (pick.end_episode !== null) {
          const endEpisode = episodes.find(ep => ep.id === pick.end_episode);
          endEpisodeNumber = endEpisode ? endEpisode.episode_number : null;
        }

        // For replacement picks, they should only appear starting from episode AFTER the elimination
        let effectiveStartEpisode = startEpisodeNumber;
        if (pick.replaced_contestant_id) {
          effectiveStartEpisode = startEpisodeNumber + 1;
        }

        return effectiveStartEpisode <= episode.episode_number &&
               (endEpisodeNumber === null || endEpisodeNumber >= episode.episode_number);
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

        // Determine contestant status
        let status = 'active';

        // Check if this contestant was eliminated this episode
        if (pick.end_episode) {
          const endEpisode = episodes.find(ep => ep.id === pick.end_episode);
          if (endEpisode && endEpisode.episode_number === episode.episode_number) {
            status = 'eliminated';
          }
        }

        return {
          ...contestant,
          episode_score: scoreData?.score || 0,
          events: transformedEvents,
          pick_type: 'draft',
          is_replacement: pick.replaced_contestant_id ? true : false,
          is_active_for_scoring: true, // All contestants in this list are active for scoring
          status: status
        };
      }).filter(Boolean);

      // Handle sole survivor
      let soleSurvivor = null;
      if (player.contestants) {
        const scoreData = episodeScoreData.find(s => s.contestant_id === player.contestants.id);
        const events = episodeEventData.filter(e => e.contestant_id === player.contestants.id) || [];
        
        const transformedEvents = events.map(event => ({
          event_type: event.event_types?.name || 'unknown',
          points: event.point_value || 0,
          description: event.event_types?.display_name || event.event_types?.name || 'Event'
        }));
        
        soleSurvivor = {
          ...player.contestants,
          episode_score: scoreData?.score || 0,
          events: transformedEvents,
          pick_type: 'sole_survivor'
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
      overall_totals: overallTotals
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