import { useMemo } from 'react';
import PropTypes from 'prop-types';
import EventTypeButton from './EventTypeButton';
import '../styles/06-features/event-entry.css';

/**
 * ContestantEventRow - Row displaying contestant info and event buttons
 * Groups events by category and shows real-time score calculation
 */
const ContestantEventRow = ({ 
  contestant, 
  eventTypes, 
  activeEvents, 
  onEventToggle 
}) => {
  // Group event types by category
  const eventsByCategory = useMemo(() => {
    const grouped = {
      basic: [],
      penalty: [],
      bonus: []
    };

    // Safety check: ensure eventTypes is an array
    if (!Array.isArray(eventTypes)) {
      console.error('eventTypes is not an array:', eventTypes);
      return grouped;
    }

    eventTypes.forEach(eventType => {
      const category = eventType.category.toLowerCase();
      if (grouped[category]) {
        grouped[category].push(eventType);
      }
    });

    return grouped;
  }, [eventTypes]);

  // Calculate episode score from active events
  const episodeScore = useMemo(() => {
    return activeEvents.reduce((sum, event) => sum + event.point_value, 0);
  }, [activeEvents]);

  // Count how many times each event type is active
  const getEventCount = (eventTypeId) => {
    return activeEvents.filter(e => e.event_type_id === eventTypeId).length;
  };

  // Check if event type is active
  const isEventActive = (eventTypeId) => {
    return activeEvents.some(e => e.event_type_id === eventTypeId);
  };

  // Handle event toggle
  const handleEventToggle = (eventType) => {
    onEventToggle(contestant.id, eventType);
  };

  return (
    <div className={`contestant-event-row ${!contestant.current_tribe ? 'no-tribe' : ''}`}>
      {/* Contestant Info */}
      <div className="entity-row__info">
        <div className="entity-row__avatar">
          <div className="avatar avatar--lg">
            {contestant.image_url ? (
              <img 
                src={contestant.image_url} 
                alt={contestant.name}
                className="avatar__image"
                onError={(e) => {
                  e.target.classList.add('u-hidden');
                  e.target.nextSibling.classList.remove('u-hidden');
                  e.target.nextSibling.classList.add('u-flex');
                }}
              />
            ) : null}
            <div 
              className={`avatar__initials ${contestant.image_url ? 'u-hidden' : 'u-flex'}`}
            >
              {contestant.name.charAt(0)}
            </div>
          </div>
        </div>
        <div className="entity-row__info">
          <div className="entity-row__name-wrapper">
            <h4 className="entity-row__name">{contestant.name}</h4>
            {contestant.current_tribe ? (
              <span className={`badge badge--tribe badge--tribe-${contestant.current_tribe.toLowerCase()}`}>{contestant.current_tribe}</span>
            ) : (
              <span className="badge badge--warning" title="No tribe assigned">⚠️ No Tribe</span>
            )}
          </div>
          <div className="contestant-scores">
            <span className="score-label">Current Total:</span>
            <span className="score-value">{contestant.total_score || 0} pts</span>
          </div>
          <div className="contestant-scores episode-score">
            <span className="score-label">Episode Score:</span>
            <span className={`score-value ${episodeScore >= 0 ? 'positive' : 'negative'}`}>
              {episodeScore >= 0 ? '+' : ''}{episodeScore} pts
            </span>
          </div>
        </div>
      </div>

      {/* Event Buttons by Category */}
      <div className="event-buttons-container">
        {/* Basic Scoring Events */}
        {eventsByCategory.basic.length > 0 && (
          <div className="event-category">
            <h5 className="category-label">Basic Scoring</h5>
            <div className="event-buttons-group">
              {eventsByCategory.basic.map(eventType => (
                <EventTypeButton
                  key={eventType.id}
                  eventType={eventType}
                  isActive={isEventActive(eventType.id)}
                  count={getEventCount(eventType.id)}
                  onClick={() => handleEventToggle(eventType)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Penalty Events */}
        {eventsByCategory.penalty.length > 0 && (
          <div className="event-category">
            <h5 className="category-label">Penalties</h5>
            <div className="event-buttons-group">
              {eventsByCategory.penalty.map(eventType => (
                <EventTypeButton
                  key={eventType.id}
                  eventType={eventType}
                  isActive={isEventActive(eventType.id)}
                  count={getEventCount(eventType.id)}
                  onClick={() => handleEventToggle(eventType)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bonus Events */}
        {eventsByCategory.bonus.length > 0 && (
          <div className="event-category">
            <h5 className="category-label">Bonuses</h5>
            <div className="event-buttons-group">
              {eventsByCategory.bonus.map(eventType => (
                <EventTypeButton
                  key={eventType.id}
                  eventType={eventType}
                  isActive={isEventActive(eventType.id)}
                  count={getEventCount(eventType.id)}
                  onClick={() => handleEventToggle(eventType)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ContestantEventRow.propTypes = {
  contestant: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    image_url: PropTypes.string,
    total_score: PropTypes.number,
    current_tribe: PropTypes.string
  }).isRequired,
  eventTypes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    display_name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    point_value: PropTypes.number.isRequired
  })).isRequired,
  activeEvents: PropTypes.arrayOf(PropTypes.shape({
    event_type_id: PropTypes.number.isRequired,
    point_value: PropTypes.number.isRequired
  })).isRequired,
  onEventToggle: PropTypes.func.isRequired
};

export default ContestantEventRow;
