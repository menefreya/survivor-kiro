import React, { useState, useEffect } from 'react';
import ContestantScoreDetails from './ContestantScoreDetails';
import SoleSurvivorBonusBreakdown from './SoleSurvivorBonusBreakdown';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';
// Score breakdown styles are included in dashboard.css

/**
 * ScoreBreakdown Component
 * Displays comprehensive score breakdown for a player's team
 */
function ScoreBreakdown({ playerId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [draftPicksData, setDraftPicksData] = useState([]);
  const [soleSurvivorData, setSoleSurvivorData] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [predictionBonus, setPredictionBonus] = useState(0);

  useEffect(() => {
    fetchScoreBreakdown();
  }, [playerId]);

  const fetchScoreBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch player data with draft picks and sole survivor
      const playerResponse = await api.get(`/api/players/${playerId}`);
      const player = playerResponse.data;
      setPlayerData(player);

      // Fetch current episode
      const episodesResponse = await api.get('/api/episodes');
      const currentEp = episodesResponse.data.find(ep => ep.is_current);
      setCurrentEpisode(currentEp?.episode_number || null);

      // Fetch prediction bonus
      try {
        const predictionResponse = await api.get(`/api/predictions/bonus/${playerId}`);
        setPredictionBonus(predictionResponse.data.bonus || 0);
      } catch (err) {
        console.error('Error fetching prediction bonus:', err);
        setPredictionBonus(0);
      }

      // Fetch score breakdown for each draft pick
      const draftPicksPromises = player.draft_picks.map(async (pick) => {
        const breakdownResponse = await api.get(`/api/contestants/${pick.contestant_id}/score-breakdown`);
        return {
          ...breakdownResponse.data,
          isDraftPick: true
        };
      });

      const draftPicksBreakdowns = await Promise.all(draftPicksPromises);
      setDraftPicksData(draftPicksBreakdowns);

      // Fetch score breakdown for sole survivor if exists
      if (player.sole_survivor_id) {
        const ssBreakdownResponse = await api.get(`/api/contestants/${player.sole_survivor_id}/score-breakdown`);
        
        // Fetch sole survivor history for bonus calculation
        const historyResponse = await api.get(`/api/players/${playerId}/sole-survivor-history`);
        const currentHistory = historyResponse.data.find(h => h.end_episode === null);
        
        // Calculate bonus
        let bonus = {
          episode_count: 0,
          episode_bonus: 0,
          winner_bonus: 0,
          total_bonus: 0
        };

        if (currentHistory && currentEp) {
          const episodeCount = currentEp.episode_number - currentHistory.start_episode + 1;
          const episodeBonus = episodeCount * 1;
          
          // Check for winner bonus
          const contestant = player.draft_picks.find(p => p.contestant_id === player.sole_survivor_id)?.contestant ||
                           ssBreakdownResponse.data.contestant;
          const winnerBonus = (contestant?.is_winner && currentHistory.start_episode <= 2) ? 25 : 0;
          
          bonus = {
            episode_count: episodeCount,
            episode_bonus: episodeBonus,
            winner_bonus: winnerBonus,
            total_bonus: episodeBonus + winnerBonus
          };
        }

        setSoleSurvivorData({
          ...ssBreakdownResponse.data,
          bonus,
          history: currentHistory
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching score breakdown:', err);
      setError('Failed to load score breakdown. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="score-breakdown-modal">
        <div className="score-breakdown-content">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="score-breakdown-modal">
        <div className="score-breakdown-content">
          <div className="error-message">{error}</div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const draftScore = draftPicksData.reduce((sum, pick) => sum + (pick.contestant?.total_score || 0), 0);
  const soleSurvivorScore = soleSurvivorData?.contestant?.total_score || 0;
  const soleSurvivorBonus = soleSurvivorData?.bonus?.total_bonus || 0;
  const totalScore = draftScore + soleSurvivorScore + soleSurvivorBonus + predictionBonus;

  return (
    <div className="score-breakdown-modal" onClick={onClose}>
      <div className="score-breakdown-content" onClick={(e) => e.stopPropagation()}>
        <div className="score-breakdown-header">
          <h2>Score Breakdown</h2>
          <button onClick={onClose} className="close-button" aria-label="Close">×</button>
        </div>

        <div className="score-summary">
          <div className="summary-item">
            <span className="summary-label">Draft Picks Score:</span>
            <span className="summary-value">{draftScore} pts</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Sole Survivor Score:</span>
            <span className="summary-value">{soleSurvivorScore} pts</span>
          </div>
          {soleSurvivorBonus > 0 && (
            <div className="summary-item bonus">
              <span className="summary-label">Sole Survivor Bonus:</span>
              <span className="summary-value">+{soleSurvivorBonus} pts</span>
            </div>
          )}
          {predictionBonus > 0 && (
            <div className="summary-item bonus">
              <span className="summary-label">Prediction Bonus:</span>
              <span className="summary-value">+{predictionBonus} pts</span>
            </div>
          )}
          <div className="summary-item total">
            <span className="summary-label">Total Score:</span>
            <span className="summary-value">{totalScore} pts</span>
          </div>
        </div>

        <div className="contestants-breakdown">
          <h3>Draft Picks</h3>
          {draftPicksData.map((pickData) => (
            <ContestantScoreDetails
              key={pickData.contestant.id}
              contestant={pickData.contestant}
              episodes={pickData.episodes}
              isSoleSurvivor={false}
            />
          ))}

          {soleSurvivorData && (
            <>
              <h3>Sole Survivor</h3>
              <ContestantScoreDetails
                contestant={soleSurvivorData.contestant}
                episodes={soleSurvivorData.episodes}
                isSoleSurvivor={true}
              />
              <SoleSurvivorBonusBreakdown
                bonus={soleSurvivorData.bonus}
                history={soleSurvivorData.history}
                currentEpisode={currentEpisode}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScoreBreakdown;
