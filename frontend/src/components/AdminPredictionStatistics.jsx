import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const AdminPredictionStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/predictions/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError(error.response?.data?.error || 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message" role="alert">
        {error}
      </div>
    );
  }

  if (!statistics || statistics.overall.total_predictions === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No Statistics Available"
        message="No predictions have been submitted yet."
      />
    );
  }

  const { overall, by_episode } = statistics;

  return (
    <div className="admin-prediction-statistics">
      <h3>Prediction Statistics</h3>

      {/* Overall Statistics */}
      <div className="statistics-overview">
        <h4>Overall Statistics</h4>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{overall.total_predictions}</div>
              <div className="stat-label">Total Predictions</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{overall.scored_predictions}</div>
              <div className="stat-label">Scored Predictions</div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{overall.correct_predictions}</div>
              <div className="stat-label">Correct Predictions</div>
            </div>
          </div>

          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{overall.accuracy}%</div>
              <div className="stat-label">Overall Accuracy</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{overall.total_players}</div>
              <div className="stat-label">Total Players</div>
            </div>
          </div>
        </div>

        {/* Accuracy Progress Bar */}
        <div className="accuracy-visualization">
          <div className="accuracy-bar-container">
            <div className="accuracy-bar-label">
              <span>Overall Accuracy</span>
              <span className="accuracy-percentage">{overall.accuracy}%</span>
            </div>
            <div className="accuracy-bar-track">
              <div 
                className="accuracy-bar-fill"
                style={{ width: `${overall.accuracy}%` }}
                role="progressbar"
                aria-valuenow={overall.accuracy}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
            <div className="accuracy-bar-stats">
              <span className="correct-count">{overall.correct_predictions} correct</span>
              <span className="incorrect-count">
                {overall.scored_predictions - overall.correct_predictions} incorrect
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Episode Statistics */}
      {by_episode && by_episode.length > 0 && (
        <div className="episode-statistics">
          <h4>Statistics by Episode</h4>
          
          <div className="episode-stats-table-container">
            <table className="episode-stats-table">
              <thead>
                <tr>
                  <th>Episode</th>
                  <th>Predictions</th>
                  <th>Scored</th>
                  <th>Correct</th>
                  <th>Accuracy</th>
                  <th>Participation</th>
                </tr>
              </thead>
              <tbody>
                {by_episode.map(episode => (
                  <tr key={episode.episode_number}>
                    <td className="episode-number">
                      <strong>Episode {episode.episode_number}</strong>
                    </td>
                    <td>{episode.total_predictions}</td>
                    <td>{episode.scored_predictions}</td>
                    <td className="correct-count">{episode.correct_predictions}</td>
                    <td>
                      <div className="accuracy-cell">
                        <span className="accuracy-value">{episode.accuracy}%</span>
                        <div className="mini-progress-bar">
                          <div 
                            className="mini-progress-fill"
                            style={{ width: `${episode.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="participation-cell">
                        <span className="participation-value">
                          {episode.players_participated} / {overall.total_players}
                        </span>
                        <span className="participation-percentage">
                          ({episode.participation_rate}%)
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Predictors Section (Placeholder for future enhancement) */}
      <div className="top-predictors-section">
        <h4>Top Predictors</h4>
        <EmptyState
          icon="🏆"
          title="Coming Soon"
          message="Top predictors leaderboard will be available in a future update."
        />
      </div>
    </div>
  );
};

export default AdminPredictionStatistics;
