import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
// Modal styles are now in the main CSS architecture

const ChangeSoleSurvivorModal = ({ isOpen, onClose, currentSoleSurvivor, playerId, onSuccess }) => {
  const [contestants, setContestants] = useState([]);
  const [selectedContestantId, setSelectedContestantId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch non-eliminated contestants when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchContestants();
      setSelectedContestantId(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchContestants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/contestants');
      // Filter to only show non-eliminated contestants
      const availableContestants = response.data.filter(c => !c.is_eliminated);
      setContestants(availableContestants);
    } catch (err) {
      console.error('Error fetching contestants:', err);
      setError('Failed to load contestants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedContestantId) {
      setError('Please select a contestant');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.put(`/sole-survivor/${playerId}`, {
        contestant_id: selectedContestantId
      });
      
      // Call success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Error updating sole survivor:', err);
      setError(err.response?.data?.error || 'Failed to update sole survivor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">Change Sole Survivor</h2>
          <button 
            className="modal-close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {currentSoleSurvivor && (
            <div className="current-selection-info">
              <p className="body-text">
                <strong>Current Sole Survivor:</strong> {currentSoleSurvivor.name}
                {currentSoleSurvivor.is_eliminated && (
                  <span className="eliminated-badge u-ml-2">Eliminated</span>
                )}
              </p>
              <p className="body-text-sm u-mt-2 u-text-tertiary">
                Select a new sole survivor from the available contestants below.
              </p>
            </div>
          )}

          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          {isLoading ? (
            <LoadingSpinner size="md" text="Loading contestants..." centered={true} />
          ) : contestants.length === 0 ? (
            <div className="empty-state">
              <p>No available contestants to select.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="contestant-selection-grid">
                {contestants.map((contestant) => (
                  <label
                    key={contestant.id}
                    className={`contestant-card ${selectedContestantId === contestant.id ? 'selected' : ''}`}
                    htmlFor={`contestant-${contestant.id}`}
                  >
                    <input
                      type="radio"
                      id={`contestant-${contestant.id}`}
                      name="sole-survivor"
                      value={contestant.id}
                      checked={selectedContestantId === contestant.id}
                      onChange={() => setSelectedContestantId(contestant.id)}
                      className="contestant-radio"
                    />
                    <div className="contestant-card-content">
                      {contestant.image_url ? (
                        <img 
                          src={contestant.image_url} 
                          alt={`${contestant.name}'s profile`}
                          className="contestant-image"
                          onError={(e) => {
                            e.target.classList.add('u-hidden');
                            e.target.nextElementSibling.classList.remove('u-hidden');
                          }}
                        />
                      ) : null}
                      <div 
                        className={`contestant-initials ${contestant.image_url ? 'u-hidden' : 'u-flex'}`}
                      >
                        {contestant.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="contestant-info">
                        <h4>{contestant.name}</h4>
                        <p className="profession">{contestant.profession}</p>
                        <p className="score">Score: {contestant.total_score || 0}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!selectedContestantId || isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Sole Survivor'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeSoleSurvivorModal;
