import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/Predictions.css';

const PredictionResultsNotification = () => {
  const [recentResults, setRecentResults] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkForRecentResults();
  }, []);

  const checkForRecentResults = async () => {
    try {
      setIsLoading(true);

      // Fetch prediction history
      const response = await api.get('/predictions/history?limit=10');
      const predictions = response.data.predictions || [];

      if (predictions.length === 0) {
        setShowNotification(false);
        return;
      }

      // Find recently scored predictions (scored within last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const recentlyScored = predictions.filter(pred => {
        if (!pred.scored_at) return false;
        const scoredDate = new Date(pred.scored_at);
        return scoredDate > oneDayAgo;
      });

      if (recentlyScored.length === 0) {
        setShowNotification(false);
        return;
      }

      // Check if user has already dismissed this notification
      const lastDismissed = localStorage.getItem('lastPredictionResultsDismissed');
      if (lastDismissed) {
        const lastDismissedDate = new Date(lastDismissed);
        const mostRecentScore = new Date(recentlyScored[0].scored_at);
        
        if (mostRecentScore <= lastDismissedDate) {
          setShowNotification(false);
          return;
        }
      }

      // Calculate results summary
      const correctCount = recentlyScored.filter(p => p.is_correct).length;
      const incorrectCount = recentlyScored.length - correctCount;
      const pointsEarned = correctCount * 5;
      const episodeNumber = recentlyScored[0].episode_number;

      setRecentResults({
        episodeNumber,
        correctCount,
        incorrectCount,
        pointsEarned,
        predictions: recentlyScored
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Error checking for recent results:', error);
      setShowNotification(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Store dismissal timestamp
    localStorage.setItem('lastPredictionResultsDismissed', new Date().toISOString());
    setShowNotification(false);
  };

  if (isLoading || !showNotification || !recentResults) {
    return null;
  }

  const hasCorrect = recentResults.correctCount > 0;
  const hasIncorrect = recentResults.incorrectCount > 0;

  return (
    <div className="prediction-results-notification">
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-icon">
            {hasCorrect ? '🎉' : '📊'}
          </div>
          <div className="notification-title">
            <h3>Episode {recentResults.episodeNumber} Predictions Scored!</h3>
            <p>Your elimination predictions have been evaluated</p>
          </div>
          <button 
            className="notification-close"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>

        <div className="notification-body">
          <div className="results-summary">
            <div className="result-stat correct">
              <div className="stat-icon">✓</div>
              <div className="stat-info">
                <div className="stat-value">{recentResults.correctCount}</div>
                <div className="stat-label">Correct</div>
              </div>
            </div>

            <div className="result-stat incorrect">
              <div className="stat-icon">✗</div>
              <div className="stat-info">
                <div className="stat-value">{recentResults.incorrectCount}</div>
                <div className="stat-label">Incorrect</div>
              </div>
            </div>

            <div className="result-stat points">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-value">+{recentResults.pointsEarned}</div>
                <div className="stat-label">Points Earned</div>
              </div>
            </div>
          </div>

          {hasCorrect && (
            <div className="results-message success">
              <strong>Great job!</strong> You correctly predicted {recentResults.correctCount} elimination{recentResults.correctCount !== 1 ? 's' : ''}.
            </div>
          )}

          {!hasCorrect && hasIncorrect && (
            <div className="results-message neutral">
              Better luck next time! Keep making predictions to earn more points.
            </div>
          )}

          <div className="notification-actions">
            <Link to="/predictions/history" className="btn-primary" onClick={handleDismiss}>
              View Full Results
            </Link>
            <button className="btn-secondary" onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionResultsNotification;
