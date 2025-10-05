import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/Predictions.css';

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

  const getScoringBadge = (prediction) => {
    if (prediction.is_correct === null) {
      return <span className="status-badge status-pending">Pending</span>;
    }
    return prediction.is_correct 
      ? <span className="status-badge status-correct">✓ Correct (+3)</span>
      : <span className="status-badge status-incorrect">✗ Incorrect</span>;
  };

  const getTribeClass = (tribeName) => {
    const tribe = tribeName.toLowerCase();
    if (tribe === 'kele') return 'tribe-kele';
    if (tribe === 'hina') return 'tribe-hina';
    if (tribe === 'uli') return 'tribe-uli';
    return '';
  };

  return (
    <div className="current-predictions-card card">
      <div className="card-header">
        <div className="card-title-section">
          <h2>Episode {episodeNumber} Predictions</h2>
          <span className={`lock-badge ${isLocked ? 'locked' : 'open'}`}>
            {isLocked ? '🔒 Locked' : '🔓 Open'}
          </span>
        </div>
        <Link to="/predictions/history" className="btn-text">
          View All →
        </Link>
      </div>

      <div className="submitted-predictions-grid">
        {predictions.map((prediction, index) => (
          <div key={index} className="submitted-contestant-card">
            <div className="contestant-card-image-container">
              {prediction.contestant?.image_url ? (
                <img
                  src={prediction.contestant.image_url}
                  alt={prediction.contestant.name}
                  className="contestant-card-image"
                />
              ) : (
                <div className="contestant-card-placeholder">
                  {prediction.contestant?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            
            <div className="contestant-card-info">
              <h4 className="contestant-card-name">{prediction.contestant?.name || 'Unknown'}</h4>
              <div className={`contestant-tribe-name ${getTribeClass(prediction.tribe)}`}>{prediction.tribe} Tribe</div>
              <div className="contestant-card-details">
                {prediction.contestant?.age && <span className="detail-item">{prediction.contestant.age} years old</span>}
                {prediction.contestant?.occupation && <span className="detail-item">{prediction.contestant.occupation}</span>}
              </div>
            </div>
            
            {prediction.is_correct !== null && (
              <div className={`prediction-result ${prediction.is_correct ? 'correct' : 'incorrect'}`}>
                {prediction.is_correct ? '✓ Correct (+3)' : '✗ Incorrect'}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="prediction-info-footer">
          <p className="info-text">
            💡 Predictions will be scored after the episode airs
          </p>
        </div>
      )}
    </div>
  );
};

export default CurrentPredictionsCard;
