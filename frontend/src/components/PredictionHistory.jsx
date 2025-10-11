import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
// Prediction styles are included in dashboard.css and profile.css

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

  // Helper function to get tribe CSS class
  const getTribeClass = (tribeName) => {
    const tribe = tribeName.toLowerCase();
    if (tribe === 'kele') return 'tribe-kele';
    if (tribe === 'hina') return 'tribe-hina';
    if (tribe === 'uli') return 'tribe-uli';
    return '';
  };

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
    return (
      <div className="content-container u-flex u-justify-center u-items-center" style={{minHeight: '400px'}}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container">
        <div className="card card-danger">
          <div className="card-body u-text-center">
            <h2 className="card-title">Error Loading History</h2>
            <p className="card-text">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="content-container">
        <div className="layout-header">
          <h1 className="layout-header__title">Prediction History</h1>
        </div>
        <EmptyState 
          message="No prediction history yet"
          description="Your scored predictions will appear here after episodes air."
        />
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="layout-header">
        <h1 className="layout-header__title">Prediction History</h1>
      </div>

      {/* Filters and Sort */}
      <div className="card u-mb-6">
        <div className="card-header">
          <h2 className="card-header-title">Filter & Sort</h2>
        </div>
        <div className="card-body">
          <div className="layout-grid layout-grid--3 layout-grid--gap-sm">
            <div className="form-group">
              <label htmlFor="episode-filter" className="form-label">Episode:</label>
              <select 
                id="episode-filter"
                className="form-select"
                value={filterEpisode} 
                onChange={(e) => setFilterEpisode(e.target.value)}
              >
                <option value="all">All Episodes</option>
                {episodes.map(ep => (
                  <option key={ep} value={ep}>Episode {ep}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tribe-filter" className="form-label">Tribe:</label>
              <select 
                id="tribe-filter"
                className="form-select"
                value={filterTribe} 
                onChange={(e) => setFilterTribe(e.target.value)}
              >
                <option value="all">All Tribes</option>
                {tribes.map(tribe => (
                  <option key={tribe} value={tribe}>{tribe}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sort-by" className="form-label">Sort by:</label>
              <select 
                id="sort-by"
                className="form-select"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="episode">Episode (Newest First)</option>
                <option value="correct">Correct First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions List */}
      {filteredPredictions.length === 0 ? (
        <EmptyState 
          message="No predictions match your filters"
          description="Try adjusting your filter settings."
        />
      ) : (
        <div className="layout-stack">
          {Object.keys(groupedPredictions).sort((a, b) => b - a).map(episodeNum => (
            <div key={episodeNum} className="card">
              <div className="card-header">
                <h2 className="card-header-title">Episode {episodeNum}</h2>
              </div>
              <div className="card-body">
                <div className="layout-grid layout-grid--auto layout-grid--gap-sm">
                  {groupedPredictions[episodeNum].map((prediction, index) => (
                    <div 
                      key={index} 
                      className={`card ${prediction.is_correct ? 'card-success' : 'card-danger'} ${getTribeClass(prediction.tribe)}`}
                    >
                      <div className="card-header">
                        <div className="card-header-title u-text-base">{prediction.tribe} Tribe</div>
                        <div className="card-header-actions">
                          <span className={`badge ${prediction.is_correct ? 'badge--success' : 'badge--danger'}`}>
                            {prediction.is_correct ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="card-body">
                        <div className="u-flex u-items-center u-justify-between u-gap-4">
                          <div className="u-text-center">
                            <div className="u-text-xs u-text-secondary u-mb-1">Your Prediction</div>
                            <div className="u-text-sm u-text-bold">
                              {prediction.predicted_contestant?.name || 'Unknown'}
                            </div>
                          </div>

                          <div className="u-text-2xl">
                            {prediction.is_correct ? '✓' : '✗'}
                          </div>

                          <div className="u-text-center">
                            <div className="u-text-xs u-text-secondary u-mb-1">Actually Eliminated</div>
                            <div className="u-text-sm u-text-bold">
                              {prediction.actual_eliminated?.name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="card-footer">
                        <span className={`badge ${prediction.is_correct ? 'badge--success' : 'badge--danger'}`}>
                          {prediction.is_correct ? '+3 points' : '0 points'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionHistory;
