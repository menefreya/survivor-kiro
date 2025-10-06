import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const AdminPredictionManager = () => {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [episodeData, setEpisodeData] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockLoading, setLockLoading] = useState(false);
  const [lockSuccess, setLockSuccess] = useState('');

  // Fetch episodes on mount
  useEffect(() => {
    fetchEpisodes();
  }, []);

  // Fetch predictions when episode is selected
  useEffect(() => {
    if (selectedEpisodeId) {
      fetchEpisodePredictions(selectedEpisodeId);
    }
  }, [selectedEpisodeId]);

  const fetchEpisodes = async () => {
    try {
      const response = await api.get('/episodes');
      setEpisodes(response.data || []);
      
      // Auto-select the most recent episode
      if (response.data && response.data.length > 0) {
        const sortedEpisodes = [...response.data].sort((a, b) => b.episode_number - a.episode_number);
        setSelectedEpisodeId(sortedEpisodes[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
      setError('Failed to load episodes');
    }
  };

  const fetchEpisodePredictions = async (episodeId) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/episodes/${episodeId}/predictions`);
      setEpisodeData(response.data.episode);
      setPredictions(response.data.predictions_by_tribe || {});
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setError(error.response?.data?.error || 'Failed to load predictions');
      setPredictions({});
      setEpisodeData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEpisodeChange = (e) => {
    setSelectedEpisodeId(e.target.value);
    setLockSuccess('');
  };

  const handleToggleLock = async () => {
    if (!episodeData) return;

    const willLock = !episodeData.predictions_locked;
    
    // Check if any predictions have been scored (cannot unlock if scored)
    if (!willLock) {
      const hasScoredPredictions = Object.values(predictions).some(tribePredictions =>
        tribePredictions.some(p => p.is_correct !== null)
      );
      
      if (hasScoredPredictions) {
        setError('Cannot unlock predictions that have already been scored');
        return;
      }
    }
    
    // Show confirmation before locking
    if (willLock) {
      const confirmed = window.confirm(
        'Are you sure you want to lock predictions for this episode? Players will no longer be able to submit or modify their predictions.'
      );
      if (!confirmed) return;
    }

    setLockLoading(true);
    setError('');
    setLockSuccess('');

    try {
      const response = await api.put(`/episodes/${selectedEpisodeId}/lock-predictions`, {
        locked: willLock
      });
      
      setEpisodeData(response.data.episode);
      setLockSuccess(response.data.message);
      
      // Clear success message after 3 seconds
      setTimeout(() => setLockSuccess(''), 3000);
    } catch (error) {
      console.error('Error toggling lock:', error);
      setError(error.response?.data?.error || 'Failed to update lock status');
    } finally {
      setLockLoading(false);
    }
  };

  const getScoringStatusBadge = (prediction) => {
    if (prediction.is_correct === null) {
      return <span className="status-badge status-pending">Unscored</span>;
    }
    return prediction.is_correct 
      ? <span className="status-badge status-correct">✓ Correct</span>
      : <span className="status-badge status-incorrect">✗ Incorrect</span>;
  };

  const tribes = Object.keys(predictions).sort();
  const hasPredictions = tribes.length > 0;

  return (
    <div className="admin-prediction-manager">
      <h3>Prediction Management</h3>

      {/* Episode Selector */}
      <div className="prediction-controls">
        <div className="form-group">
          <label htmlFor="episode-select">Select Episode:</label>
          <select
            id="episode-select"
            value={selectedEpisodeId}
            onChange={handleEpisodeChange}
            className="episode-selector"
            disabled={isLoading}
          >
            <option value="">-- Select an episode --</option>
            {episodes
              .sort((a, b) => b.episode_number - a.episode_number)
              .map(episode => (
                <option key={episode.id} value={episode.id}>
                  Episode {episode.episode_number}
                  {episode.aired_date ? ` - ${new Date(episode.aired_date).toLocaleDateString()}` : ''}
                </option>
              ))}
          </select>
        </div>

        {/* Lock/Unlock Button */}
        {episodeData && (
          <div className="lock-controls">
            <button
              onClick={handleToggleLock}
              disabled={lockLoading}
              className={episodeData.predictions_locked ? 'btn-secondary' : 'btn-primary'}
              aria-label={episodeData.predictions_locked ? 'Unlock predictions' : 'Lock predictions'}
            >
              {lockLoading ? 'Processing...' : (
                episodeData.predictions_locked ? '🔓 Unlock Predictions' : '🔒 Lock Predictions'
              )}
            </button>
            <span className={`lock-status ${episodeData.predictions_locked ? 'locked' : 'unlocked'}`}>
              {episodeData.predictions_locked ? '🔒 Locked' : '🔓 Open'}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && <div className="error-message" role="alert">{error}</div>}
      {lockSuccess && <div className="success-message" role="status">{lockSuccess}</div>}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading predictions...</p>
        </div>
      )}

      {/* Predictions Display */}
      {!isLoading && selectedEpisodeId && (
        <>
          {!hasPredictions ? (
            <EmptyState
              icon="📊"
              title="No Predictions Yet"
              message="No players have submitted predictions for this episode."
            />
          ) : (
            <div className="predictions-by-tribe">
              {tribes.map(tribe => (
                <div key={tribe} className="tribe-predictions-section">
                  <h4 className={`tribe-header tribe-${tribe.toLowerCase()}`}>{tribe} Tribe</h4>
                  
                  <div className="predictions-table-container">
                    <table className="predictions-table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Predicted Contestant</th>
                          <th>Status</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions[tribe].map(prediction => (
                          <tr key={prediction.id}>
                            <td>
                              <div className="player-info">
                                <strong>{prediction.player.name}</strong>
                                <span className="player-email">{prediction.player.email}</span>
                              </div>
                            </td>
                            <td>
                              <div className="contestant-info">
                                {prediction.contestant.image_url && (
                                  <img
                                    src={prediction.contestant.image_url}
                                    alt={prediction.contestant.name}
                                    className="contestant-avatar-small"
                                  />
                                )}
                                <span>{prediction.contestant.name}</span>
                              </div>
                            </td>
                            <td>
                              {getScoringStatusBadge(prediction)}
                            </td>
                            <td className="timestamp">
                              {new Date(prediction.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedEpisodeId && !isLoading && (
        <EmptyState
          icon="📺"
          title="Select an Episode"
          message="Choose an episode from the dropdown to view predictions."
        />
      )}
    </div>
  );
};

export default AdminPredictionManager;
