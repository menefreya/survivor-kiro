import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Predictions.css';

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

      // Get current episode
      const episodeResponse = await api.get('/episodes/current');
      const currentEpisode = episodeResponse.data;

      if (!currentEpisode) {
        setShowBanner(false);
        return;
      }

      // Check if predictions are locked
      if (currentEpisode.predictions_locked) {
        setShowBanner(false);
        return;
      }

      // Check if user has already submitted predictions
      const predictionsResponse = await api.get('/predictions/current');
      const userPredictions = predictionsResponse.data;

      if (userPredictions && userPredictions.has_submitted) {
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

  const handleDismiss = () => {
    setShowBanner(false);
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
        <div className="prediction-reminder-icon">
          {isUrgent ? '⚠️' : '📊'}
        </div>
        <div className="prediction-reminder-text">
          <strong>
            {isUrgent ? 'Urgent: ' : ''}
            Episode {episodeNumber} Predictions Available
          </strong>
          <p>
            {isUrgent 
              ? 'Predictions close soon! Make your elimination predictions now.'
              : 'Make your elimination predictions to earn bonus points.'}
          </p>
        </div>
        <div className="prediction-reminder-actions">
          <button 
            className="btn-primary"
            onClick={handleMakePredictions}
          >
            Make Predictions
          </button>
          <button 
            className="btn-text"
            onClick={handleDismiss}
            aria-label="Dismiss reminder"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictionReminder;
