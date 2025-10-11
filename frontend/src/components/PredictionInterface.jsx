import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
// Prediction styles are included in dashboard.css and admin.css

const PredictionInterface = () => {
  const { user } = useContext(AuthContext);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [tribes, setTribes] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [submittedPredictions, setSubmittedPredictions] = useState([]);
  const [allPlayersPredictions, setAllPlayersPredictions] = useState([]);
  const [playersWithoutPredictions, setPlayersWithoutPredictions] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchPredictionData();
  }, []);

  const fetchPredictionData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch current episode and check if predictions are locked
      const episodeResponse = await api.get('/episodes/current');
      const episode = episodeResponse.data;
      
      if (!episode) {
        setError('No current episode available for predictions');
        setIsLoading(false);
        return;
      }

      setCurrentEpisode(episode);
      setIsLocked(episode.predictions_locked || false);

      // Fetch existing predictions for current user
      try {
        const predictionsResponse = await api.get('/predictions/current');
        const predictionData = predictionsResponse.data;
        
        if (predictionData.has_submitted) {
          setHasSubmitted(true);
          
          // Convert predictions object to array format for display
          const predictionsArray = Object.entries(predictionData.predictions || {}).map(([tribe, data]) => ({
            tribe,
            contestant: data.contestant,
            contestant_id: data.contestant?.id,
            is_correct: data.is_correct,
            scored_at: data.scored_at,
            created_at: data.created_at
          }));
          
          setSubmittedPredictions(predictionsArray);
          
          // Populate predictions state with existing predictions
          const predictionMap = {};
          predictionsArray.forEach(pred => {
            predictionMap[pred.tribe] = pred.contestant_id;
          });
          setPredictions(predictionMap);
        }
      } catch (predError) {
        // No existing predictions is fine
        console.log('No existing predictions found');
      }

      // Fetch active tribes with contestants
      await fetchTribesAndContestants();

      // Fetch all players' predictions
      await fetchAllPlayersPredictions();

    } catch (err) {
      console.error('Error fetching prediction data:', err);
      setError(err.response?.data?.error || 'Failed to load prediction data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllPlayersPredictions = async () => {
    try {
      const response = await api.get('/predictions/all');
      setAllPlayersPredictions(response.data.player_predictions || []);
      setPlayersWithoutPredictions(response.data.players_without_predictions || []);
    } catch (err) {
      console.error('Error fetching all predictions:', err);
      // Don't show error to user, just log it
    }
  };

  const fetchTribesAndContestants = async () => {
    try {
      // Fetch all active (non-eliminated) contestants
      const response = await api.get('/contestants');
      const allContestants = response.data;
      
      // Filter to only active contestants with a tribe
      const activeContestants = allContestants.filter(
        c => !c.is_eliminated && c.current_tribe
      );

      // Group contestants by tribe
      const tribeMap = {};
      activeContestants.forEach(contestant => {
        const tribe = contestant.current_tribe;
        if (!tribeMap[tribe]) {
          tribeMap[tribe] = [];
        }
        tribeMap[tribe].push(contestant);
      });

      // Filter out tribes with fewer than 2 contestants
      const validTribes = Object.entries(tribeMap)
        .filter(([_, contestants]) => contestants.length >= 2)
        .map(([name, contestants]) => ({
          name,
          contestants: contestants.sort((a, b) => a.name.localeCompare(b.name))
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setTribes(validTribes);
    } catch (err) {
      console.error('Error fetching tribes:', err);
      throw err;
    }
  };

  const handlePredictionChange = (tribe, contestantId) => {
    setPredictions(prev => {
      const currentSelection = prev[tribe];
      const newContestantId = parseInt(contestantId);
      
      // If clicking on the already selected contestant, clear the selection
      if (currentSelection === newContestantId) {
        return {
          ...prev,
          [tribe]: undefined
        };
      }
      
      // Otherwise, select the new contestant
      return {
        ...prev,
        [tribe]: newContestantId
      };
    });
    setError(null);
    setSuccessMessage(null);
  };

  const validatePredictions = () => {
    // Check if at least one prediction is selected
    const selectedPredictions = Object.values(predictions).filter(id => id !== undefined);
    
    if (selectedPredictions.length === 0) {
      setError('Please select at least one prediction');
      return false;
    }
    
    return true;
  };

  const getTribeClass = (tribeName) => {
    const tribe = tribeName.toLowerCase();
    if (tribe === 'kele') return 'tribe-kele';
    if (tribe === 'hina') return 'tribe-hina';
    if (tribe === 'uli') return 'tribe-uli';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePredictions()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Format predictions for API
      const formattedPredictions = Object.entries(predictions)
        .filter(([_, contestantId]) => contestantId !== undefined)
        .map(([tribe, contestantId]) => ({
          tribe,
          contestant_id: contestantId
        }));

      const response = await api.post('/predictions', {
        episode_id: currentEpisode.id,
        predictions: formattedPredictions
      });

      setHasSubmitted(true);
      
      // Fetch the full prediction data with contestant details
      const updatedPredictions = await api.get('/predictions/current');
      const predictionsArray = Object.entries(updatedPredictions.data.predictions || {}).map(([tribe, data]) => ({
        tribe,
        contestant: data.contestant,
        contestant_id: data.contestant?.id,
        is_correct: data.is_correct,
        scored_at: data.scored_at,
        created_at: data.created_at
      }));
      
      setSubmittedPredictions(predictionsArray);
      
      // Scroll to success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err) {
      console.error('Error submitting predictions:', err);
      const errorMessage = err.response?.data?.error || 'Failed to submit predictions';
      setError(errorMessage);
      
      // Scroll to error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="prediction-interface">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !currentEpisode) {
    return (
      <div className="prediction-interface">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (tribes.length === 0) {
    return (
      <div className="prediction-interface">
        <h2>Episode {currentEpisode?.episode_number} Elimination Predictions</h2>
        <div className="info-message">
          No tribes are currently available for predictions. Tribes need at least 2 active contestants.
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-interface">
      <div className="prediction-header">
        <h2>Episode {currentEpisode?.episode_number} Elimination Predictions</h2>
        {hasSubmitted && (
          <span className="status-badge status-submitted">✓ Submitted</span>
        )}
      </div>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      {!hasSubmitted && !isLocked && (
        <form onSubmit={handleSubmit} className="prediction-form">
          <p className="instructions">
            Select which contestant you think will be eliminated from each tribe.
            You can skip tribes if you're unsure. Earn +3 points for each correct prediction!
          </p>

          <div className="tribes-container">
            {tribes.map(tribe => (
              <div key={tribe.name} className="tribe-section">
                <h3 className="tribe-section-title">{tribe.name} Tribe</h3>
                <p className="tribe-instruction">Click on a contestant to predict their elimination:</p>

                <div className="contestant-cards-grid">
                  {tribe.contestants.map(contestant => (
                    <div
                      key={contestant.id}
                      className={`contestant-prediction-card ${predictions[tribe.name] === contestant.id ? 'selected' : ''}`}
                      onClick={() => handlePredictionChange(tribe.name, contestant.id.toString())}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePredictionChange(tribe.name, contestant.id.toString());
                        }
                      }}
                      aria-pressed={predictions[tribe.name] === contestant.id}
                    >
                      {predictions[tribe.name] === contestant.id && (
                        <div className="selected-indicator">✓</div>
                      )}

                      <div className="contestant-card-image-container">
                        {contestant.image_url ? (
                          <img
                            src={contestant.image_url}
                            alt={contestant.name}
                            className="contestant-card-image"
                          />
                        ) : (
                          <div className="contestant-card-placeholder">
                            {contestant.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="contestant-card-info">
                        <h4 className="contestant-card-name">{contestant.name}</h4>
                        <div className="contestant-card-details">
                          {contestant.profession && <span className="detail-item">{contestant.profession}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Predictions'}
          </button>
        </form>
      )}

      {isLocked && (
        <div className="locked-message">
          <div className="locked-header">
            <div className="locked-icon">🔒</div>
            <h3>Predictions are Locked</h3>
            <p>Predictions for Episode {currentEpisode?.episode_number} are now closed.</p>
          </div>
        </div>
      )}

      {/* All Players' Predictions Section - Comparison Grid */}
      {allPlayersPredictions.length > 0 && (() => {
        // Include current user in the display
        const allPlayers = [...allPlayersPredictions];

        // Add players without predictions to the list
        const playersWithoutPredictionsFiltered = playersWithoutPredictions.map(p => ({
          player: p,
          predictions: []
        }));

        // Sort: current user first, then players with predictions alphabetically, then players without predictions alphabetically
        const playersWithPredictions = allPlayers.sort((a, b) => {
          if (a.player.id === user?.id) return -1;
          if (b.player.id === user?.id) return 1;
          return a.player.name.localeCompare(b.player.name);
        });

        const playersWithoutPredictionsSorted = playersWithoutPredictionsFiltered.sort((a, b) => {
          return a.player.name.localeCompare(b.player.name);
        });

        // Combine: players with predictions first, then players without predictions
        const combinedPlayers = [...playersWithPredictions, ...playersWithoutPredictionsSorted];

        // Get all unique tribes from players who have predictions
        const allTribes = [...new Set(
          allPlayers.flatMap(p => p.predictions.map(pred => pred.tribe))
        )].sort();

        return (
          <div id="compare" className="all-predictions-section">
            <h3 className="all-predictions-title">All Players' Predictions</h3>

            <div className="predictions-comparison-grid">
              {/* Header Row */}
              <div className="comparison-grid-header">
                <div className="comparison-header-cell player-header">Player</div>
                {allTribes.map(tribe => (
                  <div key={tribe} className={`comparison-header-cell tribe-header ${getTribeClass(tribe)}`}>
                    {tribe}
                  </div>
                ))}
              </div>

              {/* Player Rows */}
              {combinedPlayers.map((playerData) => (
                <div key={playerData.player.id} className={`comparison-grid-row ${playerData.player.id === user?.id ? 'current-user-row' : ''}`}>
                  {/* Player Name Cell */}
                  <div className="comparison-cell player-cell">
                    <div className="player-info-compact">
                      {playerData.player.profile_image_url ? (
                        <img
                          src={playerData.player.profile_image_url}
                          alt={playerData.player.name}
                          className="avatar avatar--sm"
                        />
                      ) : (
                        <div className="avatar avatar--sm avatar__initials">
                          {playerData.player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="entity-row__name">{playerData.player.name}</span>
                    </div>
                  </div>

                  {/* Prediction Cells for each tribe */}
                  {allTribes.map(tribe => {
                    const prediction = playerData.predictions.find(p => p.tribe === tribe);

                    return (
                      <div key={tribe} className="comparison-cell prediction-cell">
                        {prediction ? (
                          <div className="prediction-compact">
                            <div className="prediction-compact-avatar">
                              {prediction.contestant?.image_url ? (
                                <img
                                  src={prediction.contestant.image_url}
                                  alt={prediction.contestant.name}
                                  className="prediction-contestant-thumb"
                                />
                              ) : (
                                <div className="prediction-contestant-thumb-placeholder">
                                  {prediction.contestant?.name?.charAt(0) || '?'}
                                </div>
                              )}
                              {prediction.is_correct !== null && (
                                <span className={`prediction-result-icon ${prediction.is_correct ? 'correct' : 'incorrect'}`}>
                                  {prediction.is_correct ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                            <span className="entity-row__name">
                              {prediction.contestant?.name?.split(' ')[0] || 'Unknown'}
                            </span>
                          </div>
                        ) : (
                          <span className="no-prediction-text">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Back to Dashboard Button */}
      <div className="prediction-actions">
        <Link to="/home" className="btn-link">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PredictionInterface;
