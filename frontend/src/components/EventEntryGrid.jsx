import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import ContestantEventRow from './ContestantEventRow';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';
import '../styles/06-features/event-entry.css';

/**
 * EventEntryGrid - Grid component for managing events for all contestants
 * Fetches event types, manages state, and provides save functionality
 */
const EventEntryGrid = ({ episodeId, contestants, onSave }) => {
  const [eventTypes, setEventTypes] = useState([]);
  const [contestantEvents, setContestantEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch event types and existing events on mount or episode change
  useEffect(() => {
    if (episodeId) {
      fetchData();
    }
  }, [episodeId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch event types
      const eventTypesResponse = await api.get('/event-types');
      const eventTypesData = eventTypesResponse.data;
      
      // Handle different response formats
      let flatEventTypes = [];
      
      if (Array.isArray(eventTypesData)) {
        // Already a flat array
        flatEventTypes = eventTypesData;
      } else if (eventTypesData && typeof eventTypesData === 'object') {
        // Grouped by category: {basic: [...], penalty: [...], bonus: [...]}
        // Flatten into a single array
        Object.values(eventTypesData).forEach(categoryArray => {
          if (Array.isArray(categoryArray)) {
            flatEventTypes = flatEventTypes.concat(categoryArray);
          }
        });
      } else {
        console.error('Event types response format not recognized:', eventTypesData);
      }
      
      setEventTypes(flatEventTypes);

      // Fetch existing events for this episode
      const eventsResponse = await api.get(`/episodes/${episodeId}/events`);
      
      // Transform events data into contestantEvents state
      const eventsMap = {};
      contestants.forEach(contestant => {
        eventsMap[contestant.id] = [];
      });

      eventsResponse.data.forEach(item => {
        if (item.events && Array.isArray(item.events)) {
          eventsMap[item.contestant_id] = item.events.map(event => ({
            id: event.id,
            event_type_id: event.event_type_id,
            point_value: event.point_value
          }));
        }
      });

      setContestantEvents(eventsMap);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  // Handle event toggle for a contestant
  const handleEventToggle = (contestantId, eventType) => {
    setContestantEvents(prev => {
      const currentEvents = prev[contestantId] || [];
      
      // Check if this event type is already active
      const existingEventIndex = currentEvents.findIndex(
        e => e.event_type_id === eventType.id
      );

      let newEvents;
      if (existingEventIndex >= 0) {
        // Remove the event (toggle off)
        newEvents = currentEvents.filter((_, index) => index !== existingEventIndex);
      } else {
        // Add the event (toggle on)
        newEvents = [
          ...currentEvents,
          {
            event_type_id: eventType.id,
            point_value: eventType.point_value,
            // Temporary ID for new events (will be replaced after save)
            id: `temp-${Date.now()}-${Math.random()}`
          }
        ];
      }

      return {
        ...prev,
        [contestantId]: newEvents
      };
    });
  };

  // Calculate total changes for summary
  const changesSummary = useMemo(() => {
    let totalEvents = 0;
    let totalPoints = 0;

    Object.values(contestantEvents).forEach(events => {
      totalEvents += events.length;
      totalPoints += events.reduce((sum, event) => sum + event.point_value, 0);
    });

    return { totalEvents, totalPoints };
  }, [contestantEvents]);

  // Handle save all events
  const handleSaveAll = async () => {
    setSaving(true);
    setError('');

    try {
      // Prepare bulk update payload
      const eventsToAdd = [];
      const eventsToRemove = [];

      // Fetch current events from server to compare
      const currentEventsResponse = await api.get(`/episodes/${episodeId}/events`);
      const currentEventsMap = {};
      
      currentEventsResponse.data.forEach(item => {
        if (item.events && Array.isArray(item.events)) {
          currentEventsMap[item.contestant_id] = item.events;
        }
      });

      // Compare current state with server state
      contestants.forEach(contestant => {
        const localEvents = contestantEvents[contestant.id] || [];
        const serverEvents = currentEventsMap[contestant.id] || [];

        // Find events to add (in local but not on server)
        localEvents.forEach(localEvent => {
          // Only add if it's a new event (has temp ID or not found on server)
          const isNew = String(localEvent.id).startsWith('temp-') ||
            !serverEvents.find(se => se.id === localEvent.id);
          
          if (isNew) {
            eventsToAdd.push({
              contestant_id: contestant.id,
              event_type_id: localEvent.event_type_id
            });
          }
        });

        // Find events to remove (on server but not in local)
        serverEvents.forEach(serverEvent => {
          const stillExists = localEvents.find(le => le.id === serverEvent.id);
          if (!stillExists) {
            eventsToRemove.push(serverEvent.id);
          }
        });
      });

      // Call bulk update API
      await api.post(`/episodes/${episodeId}/events/bulk`, {
        add: eventsToAdd,
        remove: eventsToRemove
      });

      // Refresh data after save
      await fetchData();

      // Notify parent component
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Error saving events:', err);
      setError(err.response?.data?.error || 'Failed to save events');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="event-entry-grid-loading">
        <LoadingSpinner />
        <p>Loading event data...</p>
      </div>
    );
  }

  if (error && !saving) {
    return (
      <div className="event-entry-grid-error">
        <p className="error-message">{error}</p>
        <button onClick={fetchData} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="event-entry-grid">
      {/* Summary Header */}
      <div className="event-entry-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Events:</span>
            <span className="stat-value">{changesSummary.totalEvents}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Points:</span>
            <span className={`stat-value ${changesSummary.totalPoints >= 0 ? 'positive' : 'negative'}`}>
              {changesSummary.totalPoints >= 0 ? '+' : ''}{changesSummary.totalPoints}
            </span>
          </div>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary save-all-button"
          aria-busy={saving}
        >
          {saving ? 'Saving...' : 'Save All Events'}
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Contestant Rows - Grouped by Tribe */}
      <div className="contestant-rows">
        {(() => {
          // Group contestants by tribe
          const contestantsByTribe = contestants.reduce((acc, contestant) => {
            const tribe = contestant.current_tribe || 'No Tribe';
            if (!acc[tribe]) {
              acc[tribe] = [];
            }
            acc[tribe].push(contestant);
            return acc;
          }, {});

          // Sort tribes: named tribes first (alphabetically), then "No Tribe"
          const sortedTribes = Object.keys(contestantsByTribe).sort((a, b) => {
            if (a === 'No Tribe') return 1;
            if (b === 'No Tribe') return -1;
            return a.localeCompare(b);
          });

          return sortedTribes.map(tribe => (
            <div key={tribe} className="tribe-group">
              <div className="tribe-group-header">
                <h3 className={`tribe-group-title ${tribe === 'No Tribe' ? 'no-tribe-header' : ''}`}>
                  {tribe === 'No Tribe' ? '⚠️ ' : ''}{tribe}
                  <span className="tribe-contestant-count">
                    ({contestantsByTribe[tribe].length} {contestantsByTribe[tribe].length === 1 ? 'contestant' : 'contestants'})
                  </span>
                </h3>
              </div>
              <div className="tribe-contestants">
                {contestantsByTribe[tribe].map(contestant => (
                  <ContestantEventRow
                    key={contestant.id}
                    contestant={contestant}
                    eventTypes={eventTypes}
                    activeEvents={contestantEvents[contestant.id] || []}
                    onEventToggle={handleEventToggle}
                  />
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Bottom Save Button */}
      <div className="event-entry-bottom-actions">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary save-all-button-bottom"
          aria-busy={saving}
        >
          {saving ? 'Saving...' : 'Save All Events'}
        </button>
      </div>
    </div>
  );
};

EventEntryGrid.propTypes = {
  episodeId: PropTypes.number.isRequired,
  contestants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    image_url: PropTypes.string,
    total_score: PropTypes.number,
    current_tribe: PropTypes.string
  })).isRequired,
  onSave: PropTypes.func
};

export default EventEntryGrid;
