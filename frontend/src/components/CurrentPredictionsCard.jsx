import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ContestantRow from './ContestantRow';
// Prediction styles are included in dashboard.css

const CurrentPredictionsCard = () => {
  const [predictions, setPredictions] = useState([]);
  const [episodeNumber, setEpisodeNumber] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentPredictions();
  }, []);

  const fetchCurrentPredictions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/predictions/current');
      const data = response.data;

      if (data.episode) {
        setEpisodeNumber(data.episode.episode_number);
        setIsLocked(data.episode.predictions_locked);
      }

      if (data.has_submitted) {
        setHasSubmitted(true);
        
        // Convert predictions object to array
        const predictionsArray = Object.entries(data.predictions || {}).map(([tribe, predData]) => ({
          tribe,
          contestant: predData.contestant,
          is_correct: predData.is_correct,
          scored_at: predData.scored_at
        }));
        
        setPredictions(predictionsArray);
      }
    } catch (error) {
      console.error('Error fetching current predictions:', error);
      // Silently fail - predictions are optional
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show anything if no predictions submitted
  if (isLoading || !hasSubmitted || predictions.length === 0) {
    return null;
  }



  return (
    <div className="dashboard-card current-predictions-card" role="region" aria-label="Current Episode Predictions">
      <div className="layout-section-header">
        <h2 className="layout-section-header__title" id="predictions-title">Episode {episodeNumber} Predictions</h2>
        <div className="layout-section-header__actions">
          <Link to="/predictions#compare" className="compare-link">
            Compare Predictions →
          </Link>
        </div>
      </div>

      <div className="layout-section-body">
        <div className="team-contestants-list" role="list" aria-labelledby="predictions-title">
          {predictions.map((prediction, index) => {
            const getTribeClass = (tribeName) => {
              const tribe = tribeName.toLowerCase();
              if (tribe === 'kele') return 'tribe-kele';
              if (tribe === 'hina') return 'tribe-hina';
              if (tribe === 'uli') return 'tribe-uli';
              return '';
            };

            // Create contestant object with prediction-specific data
            const contestantWithPrediction = {
              ...prediction.contestant,
              // Show just the occupation without "Contestant" fallback
              profession: prediction.contestant?.occupation || prediction.contestant?.profession,
              // Show actual contestant total score, not prediction scoring
              total_score: prediction.contestant?.total_score || 0,
              // Don't show elimination status for predictions
              is_eliminated: false
            };

            // Create custom stats content with tribe pill
            const customStats = (
              <div className="prediction-stats">
                <div className={`badge badge--tribe badge--tribe-${prediction.tribe.toLowerCase()}`}>
                  {prediction.tribe}
                </div>
                {prediction.is_correct === true && (
                  <div className="prediction-result-badge correct">
                    ✓ Correct (+3)
                  </div>
                )}
              </div>
            );

            return (
              <div key={index} className="prediction-contestant-wrapper">
                <ContestantRow
                  contestant={contestantWithPrediction}
                  showCrown={false}
                  isSoleSurvivor={false}
                  customStats={customStats}
                />
              </div>
            );
          })}
        </div>

        {!isLocked && (
          <div className="prediction-info-footer">
            <p className="info-text">
              💡 Predictions will be scored after the episode airs
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentPredictionsCard;
