import { useState, useEffect } from 'react';
import EventEntryGrid from './EventEntryGrid';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import api from '../services/api';
import '../styles/06-features/event-entry.css';

/**
 * AdminEventEntry - Main page component for admin event entry
 * Provides episode selection and integrates EventEntryGrid
 */
const AdminEventEntry = () => {
  const [episodes, setEpisodes] = useState([]);
  const [contestants, setContestants] = useState([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creatingEpisode, setCreatingEpisode] = useState(false);
  const [settingCurrentEpisode, setSettingCurrentEpisode] = useState(false);


  // Fetch episodes and contestants on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch contestants when episode changes
  useEffect(() => {
    if (selectedEpisodeId) {
      fetchContestantsForEpisode(selectedEpisodeId);
    }
  }, [selectedEpisodeId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch episodes
      const episodesResponse = await api.get('/scores/episodes');
      setEpisodes(episodesResponse.data);

      // Auto-select the current episode if available, otherwise most recent
      if (episodesResponse.data.length > 0) {
        const currentEpisode = episodesResponse.data.find(ep => ep.is_current);
        const episodeToSelect = currentEpisode || episodesResponse.data[episodesResponse.data.length - 1];
        setSelectedEpisodeId(episodeToSelect.id);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchContestantsForEpisode = async (episodeId) => {
    try {
      // Fetch contestants filtered by episode (excludes those eliminated before this episode)
      const contestantsResponse = await api.get(`/contestants?episodeId=${episodeId}`);
      setContestants(contestantsResponse.data);
    } catch (err) {
      console.error('Error fetching contestants for episode:', err);
      setError(err.response?.data?.error || 'Failed to load contestants');
    }
  };

  // Handle episode selection change
  const handleEpisodeChange = async (e) => {
    const value = e.target.value;
    
    // Check if "new" option was selected
    if (value === 'new') {
      await handleCreateNewEpisode();
      return;
    }
    
    const episodeId = parseInt(value, 10);
    setSelectedEpisodeId(episodeId);
    setSuccessMessage('');
    setError('');
  };

  // Handle creating a new episode
  const handleCreateNewEpisode = async () => {
    setCreatingEpisode(true);
    setError('');
    setSuccessMessage('');

    try {
      // Calculate next episode number
      const nextEpisodeNumber = episodes.length > 0
        ? Math.max(...episodes.map(ep => ep.episode_number)) + 1
        : 1;

      // Create new episode
      const response = await api.post('/scores/episodes', {
        episode_number: nextEpisodeNumber,
        aired_date: new Date().toISOString().split('T')[0] // Today's date
      });

      const newEpisode = response.data;
      
      // Update episodes list
      setEpisodes([...episodes, newEpisode]);
      
      // Select the new episode
      setSelectedEpisodeId(newEpisode.id);
      
      setSuccessMessage(`Episode ${nextEpisodeNumber} created successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error creating episode:', err);
      setError(err.response?.data?.error || 'Failed to create episode');
    } finally {
      setCreatingEpisode(false);
    }
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    setSuccessMessage('Events saved successfully!');
    setError('');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);

    // Refresh contestants to get updated scores
    fetchContestants();
  };

  const fetchContestants = async () => {
    try {
      // Fetch contestants filtered by the current episode
      if (selectedEpisodeId) {
        await fetchContestantsForEpisode(selectedEpisodeId);
      }
    } catch (err) {
      console.error('Error fetching contestants:', err);
    }
  };

  // Handle setting current episode
  const handleSetCurrentEpisode = async (episodeId) => {
    setSettingCurrentEpisode(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.put(`/episodes/${episodeId}/set-current`);

      // Update episodes list to reflect the change
      setEpisodes(episodes.map(ep => ({
        ...ep,
        is_current: ep.id === episodeId
      })));

      setSuccessMessage(response.data.message || 'Current episode updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error setting current episode:', err);
      setError(err.response?.data?.error || 'Failed to set current episode');
    } finally {
      setSettingCurrentEpisode(false);
    }
  };

  // Get selected episode details
  const selectedEpisode = episodes.find(ep => ep.id === selectedEpisodeId);

  if (loading) {
    return (
      <div className="admin-event-entry-loading">
        <LoadingSpinner />
        <p>Loading event entry interface...</p>
      </div>
    );
  }

  if (error && episodes.length === 0) {
    return (
      <div className="admin-event-entry-error">
        <p className="error-message">{error}</p>
        <button onClick={fetchInitialData} className="btn btn--secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-event-entry">
      <div className="event-entry-header">
        <h3>Episode Event Entry</h3>
        <p className="event-entry-description">
          Record events for each contestant to automatically calculate episode scores.
        </p>
      </div>

      {/* Episode Selector */}
      <div className="episode-selector-container">
        <div className="form-group">
          <label htmlFor="episode-select" className="required">
            Select Episode
          </label>
          <select
            id="episode-select"
            value={selectedEpisodeId || ''}
            onChange={handleEpisodeChange}
            className="episode-select"
            aria-label="Select episode for event entry"
            disabled={creatingEpisode}
          >
            <option value="" disabled>Choose an episode...</option>
            {episodes.map(episode => (
              <option key={episode.id} value={episode.id}>
                Episode {episode.episode_number}
                {episode.is_current ? ' (Current)' : ''}
                {episode.aired_date ? ` - ${(() => {
                  const [year, month, day] = episode.aired_date.split('-').map(Number);
                  return new Date(year, month - 1, day).toLocaleDateString();
                })()}` : ''}
              </option>
            ))}
            <option value="new" className="new-episode-option">
              ➕ Create New Episode
            </option>
          </select>
          
          {creatingEpisode && (
            <div className="creating-episode-indicator">
              <LoadingSpinner />
              <span>Creating new episode...</span>
            </div>
          )}
        </div>

        {selectedEpisode && (
          <div className="selected-episode-info">
            <div className="episode-info-header">
              <div>
                <h4>Episode {selectedEpisode.episode_number}</h4>
                {selectedEpisode.is_current && (
                  <span className="current-episode-badge">Current Episode</span>
                )}
              </div>
              {!selectedEpisode.is_current && (
                <button
                  onClick={() => handleSetCurrentEpisode(selectedEpisode.id)}
                  className="btn btn--secondary btn--small"
                  disabled={settingCurrentEpisode}
                  aria-label="Set as current episode"
                >
                  {settingCurrentEpisode ? 'Setting...' : 'Set as Current'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-message" role="status">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Event Entry Grid */}
      {selectedEpisodeId && contestants.length > 0 ? (
        <EventEntryGrid
          episodeId={selectedEpisodeId}
          contestants={contestants}
          onSave={handleSaveSuccess}
        />
      ) : selectedEpisodeId && contestants.length === 0 ? (
        <EmptyState
          message="No contestants available"
          description="Please add contestants before entering events."
        />
      ) : null}

      {/* Event Summary */}
      {selectedEpisodeId && contestants.length > 0 && (
        <div className="event-entry-footer">
          <div className="event-summary-info">
            <p>
              <strong>Tip:</strong> Click event buttons to toggle them on/off. 
              Green buttons indicate positive points, red buttons indicate penalties. 
              Click "Save All Events" when finished.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventEntry;
