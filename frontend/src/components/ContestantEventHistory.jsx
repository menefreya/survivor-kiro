import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import '../styles/06-features/event-entry.css';

/**
 * ContestantEventHistory - Display all events for a contestant across episodes
 * Shows episode number, event name, points, and date
 * Groups events by episode
 * Accessible from admin interface
 */
const ContestantEventHistory = ({ contestantId, onClose, onEventDeleted }) => {
  const [contestant, setContestant] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingEventId, setDeletingEventId] = useState(null);

  useEffect(() => {
    if (contestantId) {
      fetchContestantEvents();
    }
  }, [contestantId]);

  const fetchContestantEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/contestants/${contestantId}/events`);
      setContestant(response.data.contestant);
      setEvents(response.data.events);
    } catch (err) {
      console.error('Error fetching contestant events:', err);
      setError(err.response?.data?.error || 'Failed to load event history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId, episodeId) => {
    if (!window.confirm('Are you sure you want to delete this event? This will recalculate scores.')) {
      return;
    }

    setDeletingEventId(eventId);

    try {
      await api.delete(`/episodes/${episodeId}/events/${eventId}`);
      
      // Refresh the event list
      await fetchContestantEvents();
      
      // Notify parent component if callback provided
      if (onEventDeleted) {
        onEventDeleted();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert(err.response?.data?.error || 'Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  };

  // Group events by episode
  const groupEventsByEpisode = () => {
    const grouped = {};
    
    events.forEach(event => {
      const episodeNum = event.episode_number;
      if (!grouped[episodeNum]) {
        grouped[episodeNum] = {
          episode_number: episodeNum,
          episode_id: event.episode_id,
          events: []
        };
      }
      grouped[episodeNum].events.push(event);
    });

    // Convert to array and sort by episode number
    return Object.values(grouped).sort((a, b) => a.episode_number - b.episode_number);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content event-history-modal" onClick={(e) => e.stopPropagation()}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content event-history-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Event History</h2>
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <EmptyState 
            message={error}
            icon="⚠️"
          />
        </div>
      </div>
    );
  }

  const groupedEvents = groupEventsByEpisode();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Event History: {contestant?.name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {events.length === 0 ? (
            <EmptyState 
              message="No events recorded for this contestant yet"
              icon="📋"
            />
          ) : (
            <div className="event-history-list">
              {groupedEvents.map(episode => (
                <div key={episode.episode_number} className="event-history-episode">
                  <h3 className="episode-header">
                    Episode {episode.episode_number}
                    <span className="episode-event-count">
                      {episode.events.length} event{episode.events.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  
                  <div className="event-history-items">
                    {episode.events.map(event => (
                      <div key={event.id} className="event-history-item">
                        <div className="event-info">
                          <div className="event-name">{event.event_display_name}</div>
                          <div className="event-meta">
                            <span className={`event-points ${event.points >= 0 ? 'positive' : 'negative'}`}>
                              {event.points >= 0 ? '+' : ''}{event.points} pts
                            </span>
                            <span className="event-date">{formatDate(event.created_at)}</span>
                          </div>
                        </div>
                        
                        <button
                          className="btn-delete-event"
                          onClick={() => handleDeleteEvent(event.id, episode.episode_id)}
                          disabled={deletingEventId === event.id}
                          aria-label={`Delete ${event.event_display_name} event`}
                        >
                          {deletingEventId === event.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

ContestantEventHistory.propTypes = {
  contestantId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onEventDeleted: PropTypes.func
};

export default ContestantEventHistory;
