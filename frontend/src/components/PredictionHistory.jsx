import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import '../styles/Predictions.css';

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterEpisode, setFilterEpisode] = useState('all');
  const [filterTribe, setFilterTribe] = useState('all');
  const [sortBy, setSortBy] = useState('episode');

  useEffect(() => {
    fetchPredictionHistory();
  }, []);

  const fetchPredictionHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/predictions/history');
      
      setPredictions(response.data.predictions || []);
    } catch (err) {
      console.error('Error fetching prediction history:', err);
      setError(err.response?.data?.error || 'Failed to load prediction history');
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique episodes and tribes for filters
  const episodes = [...new Set(predictions.map(p => p.episode_number))].sort((a, b) => b - a);
  const tribes = [...new Set(predictions.map(p => p.tribe))].sort();

  // Filter and sort predictions
  const getFilteredAndSortedPredictions = () => {
    let filtered = [...predictions];

    // Apply episode filter
    if (filterEpisode !== 'all') {
      filtered = filtered.filter(p => p.episode_number === parseInt(filterEpisode));
    }

    // Apply tribe filter
    if (filterTribe !== 'all') {
      filtered = filtered.filter(p => p.tribe === filterTribe);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'episode') {
        return b.episode_number - a.episode_number; // Newest first
      } else if (sortBy === 'correct') {
        // Correct predictions first
        if (a.is_correct === b.is_correct) {
          return b.episode_number - a.episode_number;
        }
        return b.is_correct - a.is_correct;
      }
      return 0;
    });

    return filtered;
  };

  const filteredPredictions = getFilteredAndSortedPredictions();

  // Group predictions by episode
  const groupedPredictions = filteredPredictions.reduce((acc, prediction) => {
    const episode = prediction.episode_number;
    if (!acc[episode]) {
      acc[episode] = [];
    }
    acc[episode].push(prediction);
    return acc;
  }, {});

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="prediction-history">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="prediction-history">
        <h2>Prediction History</h2>
        <EmptyState 
          message="No prediction history yet"
          description="Your scored predictions will appear here after episodes air."
        />
      </div>
    );
  }

  return (
    <div className="prediction-history">
      <div className="prediction-history-header">
        <h2>Prediction History</h2>
      </div>

      {/* Filters and Sort */}
      <div className="prediction-filters">
        <div className="filter-group">
          <label htmlFor="episode-filter">Episode:</label>
          <select 
            id="episode-filter"
            value={filterEpisode} 
            onChange={(e) => setFilterEpisode(e.target.value)}
          >
            <option value="all">All Episodes</option>
            {episodes.map(ep => (
              <option key={ep} value={ep}>Episode {ep}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="tribe-filter">Tribe:</label>
          <select 
            id="tribe-filter"
            value={filterTribe} 
            onChange={(e) => setFilterTribe(e.target.value)}
          >
            <option value="all">All Tribes</option>
            {tribes.map(tribe => (
              <option key={tribe} value={tribe}>{tribe}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-by">Sort by:</label>
          <select 
            id="sort-by"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="episode">Episode (Newest First)</option>
            <option value="correct">Correct First</option>
          </select>
        </div>
      </div>

      {/* Predictions List */}
      {filteredPredictions.length === 0 ? (
        <EmptyState 
          message="No predictions match your filters"
          description="Try adjusting your filter settings."
        />
      ) : (
        <div className="predictions-list">
          {Object.keys(groupedPredictions).sort((a, b) => b - a).map(episodeNum => (
            <div key={episodeNum} className="episode-predictions">
              <h3 className="episode-header">Episode {episodeNum}</h3>
              <div className="predictions-grid">
                {groupedPredictions[episodeNum].map((prediction, index) => (
                  <div 
                    key={index} 
                    className={`prediction-card ${prediction.is_correct ? 'correct' : 'incorrect'}`}
                  >
                    <div className="prediction-tribe">{prediction.tribe} Tribe</div>
                    
                    <div className="prediction-result">
                      <div className="prediction-section">
                        <div className="prediction-label">Your Prediction</div>
                        <div className="contestant-name">
                          {prediction.predicted_contestant?.name || 'Unknown'}
                        </div>
                      </div>

                      <div className="prediction-arrow">
                        {prediction.is_correct ? '✓' : '✗'}
                      </div>

                      <div className="prediction-section">
                        <div className="prediction-label">Actually Eliminated</div>
                        <div className="contestant-name">
                          {prediction.actual_eliminated?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>

                    <div className="prediction-points">
                      {prediction.is_correct ? '+3 points' : '0 points'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionHistory;
