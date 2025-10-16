import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
// Prediction styles are included in dashboard.css

const PredictionReminder = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [episodeNumber, setEpisodeNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkPredictionStatus();
  }, []);

  const checkPredictionStatus = async () => {
    try {
      setIsLoading(true);

      // Get current episode and user's predictions in one call
      const predictionsResponse = await api.get('/predictions/current');
      const data = predictionsResponse.data;

      // Check if there's a current episode
      if (!data.episode) {
        setShowBanner(false);
        return;
      }

      const currentEpisode = data.episode;

      // Check if predictions are locked
      if (currentEpisode.predictions_locked) {
        setShowBanner(false);
        return;
      }

      // Check if user has already submitted predictions
      if (data.has_submitted) {
        setShowBanner(false);
        return;
      }

      // Show banner if predictions are open and not submitted
      setShowBanner(true);
      setEpisodeNumber(currentEpisode.episode_number);

      // Check if deadline is within 24 hours (if air_date is available)
      if (currentEpisode.air_date) {
        const airDate = new Date(currentEpisode.air_date);
        const now = new Date();
        const hoursUntilAir = (airDate - now) / (1000 * 60 * 60);

        if (hoursUntilAir > 0 && hoursUntilAir <= 24) {
          setIsUrgent(true);
        }
      }
    } catch (error) {
      console.error('Error checking prediction status:', error);
      setShowBanner(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePredictions = () => {
    navigate('/predictions');
  };

  if (isLoading || !showBanner) {
    return null;
  }

  return (
    <div className={`prediction-reminder-banner ${isUrgent ? 'urgent' : ''}`}>
      <div className="prediction-reminder-content">
        {isUrgent && (
          <div className="prediction-reminder-icon">
            ⚠️
          </div>
        )}
        <div className="prediction-reminder-text">
          <strong>
            Weekly Prediction Open
          </strong>
          <p>
            Submit your prediction for who will be eliminated in Episode {episodeNumber}
          </p>
          <div className="prediction-deadline">
            <span className="prediction-deadline-icon">🕐</span>
            <span>
              {isUrgent 
                ? 'Deadline: Soon! Submit now'
                : 'Deadline: Wednesday 8:00 PM EST'}
            </span>
          </div>
        </div>
        <div className="prediction-reminder-actions">
          <button 
            className="btn btn--primary"
            onClick={handleMakePredictions}
          >
            Submit Prediction
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictionReminder;
