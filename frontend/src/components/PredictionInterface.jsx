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
      // Fetch current episode and existing predictions for current user in one call
      const predictionsResponse = await api.get('/predictions/current');
      const predictionData = predictionsResponse.data;

      // Check if there's a current episode
      if (!predictionData.episode) {
        setError('No current episode available for predictions');
        setIsLoading(false);
        return;
      }

      const episode = predictionData.episode;
      setCurrentEpisode(episode);
      setIsLocked(episode.predictions_locked || false);

      // Check if user has already submitted predictions
      try {
        
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
      <div className="content-container u-flex u-justify-center u-items-center" style={{minHeight: '400px'}}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !currentEpisode) {
    return (
      <div className="content-container">
        <div className="card card-danger">
          <div className="card-body u-text-center">
            <h2 className="card-title">Error Loading Predictions</h2>
            <p className="card-text">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (tribes.length === 0) {
    return (
      <div className="content-container">
        <div className="layout-header">
          <h1 className="layout-header__title">Episode {currentEpisode?.episode_number} Elimination Predictions</h1>
        </div>
        <div className="card card-info">
          <div className="card-body u-text-center">
            <h2 className="card-title">No Tribes Available</h2>
            <p className="card-text">
              No tribes are currently available for predictions. Tribes need at least 2 active contestants.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="layout-header">
        <h1 className="layout-header__title">Episode {currentEpisode?.episode_number} Elimination Predictions</h1>
        {hasSubmitted && (
          <span className="badge badge--success">✓ Submitted</span>
        )}
      </div>
      
      {error && (
        <div className="form-message form-error">{error}</div>
      )}

      {!hasSubmitted && !isLocked && (
        <form onSubmit={handleSubmit} className="layout-stack">
          <div className="form-message form-info">
            Select which contestant you think will be eliminated from each tribe.
            You can skip tribes if you're unsure. Earn +3 points for each correct prediction!
          </div>

          <div className="layout-stack layout-stack--loose">
            {tribes.map(tribe => (
              <div key={tribe.name} className={`card ${getTribeClass(tribe.name)}`}>
                <div className="card-header">
                  <h2 className="card-header-title">{tribe.name} Tribe</h2>
                </div>
                <div className="card-body">
                  <p className="card-text">Click on a contestant to predict their elimination:</p>

                  <div className="layout-grid layout-grid--contestants layout-grid--gap-sm">
                    {tribe.contestants.map(contestant => (
                      <div
                        key={contestant.id}
                        className={`card card-interactive ${predictions[tribe.name] === contestant.id ? 'card-selected' : ''}`}
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
                          <div className="badge badge--primary u-absolute" style={{top: 'var(--spacing-2)', right: 'var(--spacing-2)'}}>✓</div>
                        )}

                        <div className="u-flex u-flex-col u-items-center u-gap-3 u-text-center">
                          <div className="avatar avatar--2xl">
                            {contestant.image_url ? (
                              <img
                                src={contestant.image_url}
                                alt={contestant.name}
                                className="avatar__image"
                              />
                            ) : (
                              <div className="avatar__initials">
                                {contestant.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="card-title u-text-base u-mb-1">{contestant.name}</h4>
                            {contestant.profession && (
                              <p className="card-meta u-text-xs">{contestant.profession}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="u-flex u-justify-center">
            <button
              type="submit"
              className={`btn btn--primary btn--lg ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Predictions'}
            </button>
          </div>
        </form>
      )}

      {isLocked && (
        <div className="card card-info u-text-center">
          <div className="card-body">
            <div className="u-text-4xl u-mb-4">🔒</div>
            <h2 className="card-title u-mb-2">Predictions are Locked</h2>
            <p className="card-text">Predictions for Episode {currentEpisode?.episode_number} are now closed.</p>
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
          <div id="compare" className="card u-w-fit u-mx-auto">
            <div className="card-header">
              <h2 className="card-header-title">All Players' Predictions</h2>
            </div>
            <div className="card-body">
              <div className="u-overflow-x-auto">
                <table className="u-w-auto u-border-collapse">
                  <thead>
                    <tr className="u-bg-tertiary">
                      <th className="u-p-3 u-text-left u-border-b u-border-subtle">Player</th>
                      {allTribes.map(tribe => (
                        <th key={tribe} className={`u-p-3 u-text-center u-border-b u-border-subtle ${getTribeClass(tribe)}`}>
                          {tribe}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {combinedPlayers.map((playerData) => (
                      <tr key={playerData.player.id} className={`u-border-b u-border-subtle ${playerData.player.id === user?.id ? 'u-bg-warning-light' : ''}`}>
                        {/* Player Name Cell */}
                        <td className="u-p-3">
                          <div className="entity-row entity-row--compact">
                            <div className="avatar avatar--sm">
                              {playerData.player.profile_image_url ? (
                                <img
                                  src={playerData.player.profile_image_url}
                                  alt={playerData.player.name}
                                  className="avatar__image"
                                />
                              ) : (
                                <div className="avatar__initials">
                                  {playerData.player.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="entity-row__name">{playerData.player.name}</span>
                          </div>
                        </td>

                        {/* Prediction Cells for each tribe */}
                        {allTribes.map(tribe => {
                          const prediction = playerData.predictions.find(p => p.tribe === tribe);

                          return (
                            <td key={tribe} className="u-p-3 u-text-center">
                              {prediction ? (
                                <div className="u-flex u-flex-col u-items-center u-gap-1">
                                  <div className="u-relative">
                                    <div className="avatar avatar--xs">
                                      {prediction.contestant?.image_url ? (
                                        <img
                                          src={prediction.contestant.image_url}
                                          alt={prediction.contestant.name}
                                          className="avatar__image"
                                        />
                                      ) : (
                                        <div className="avatar__initials">
                                          {prediction.contestant?.name?.charAt(0) || '?'}
                                        </div>
                                      )}
                                    </div>
                                    {prediction.is_correct !== null && (
                                      <span className={`badge badge--xs u-absolute ${prediction.is_correct ? 'badge--success' : 'badge--danger'}`} 
                                            style={{top: '-4px', right: '-4px'}}>
                                        {prediction.is_correct ? '✓' : '✗'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="u-text-xs u-text-secondary">
                                    {prediction.contestant?.name?.split(' ')[0] || 'Unknown'}
                                  </span>
                                </div>
                              ) : (
                                <span className="u-text-muted">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Back to Dashboard Button */}
      <div className="u-flex u-justify-center u-mt-8">
        <Link to="/home" className="btn btn--secondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PredictionInterface;
