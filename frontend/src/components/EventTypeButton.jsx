import PropTypes from 'prop-types';
import '../styles/06-features/event-entry.css';

/**
 * EventTypeButton - Button for toggling event types
 * Displays event name and point value with visual styling based on state
 */
const EventTypeButton = ({ eventType, isActive, onClick, count = 0 }) => {
  const { display_name, point_value } = eventType;
  
  // Determine button class based on point value and active state
  const getButtonClass = () => {
    const baseClass = 'event-type-button';
    
    if (isActive) {
      // When active, use specific color classes for bonus (green) and penalty (red)
      if (point_value > 0) {
        return `${baseClass} event-type-button--positive-active`;
      } else if (point_value < 0) {
        return `${baseClass} event-type-button--negative-active`;
      } else {
        return `${baseClass} active`;
      }
    } else {
      // When inactive, use neutral styling with hover effects
      const valueClass = point_value >= 0 ? 'positive' : 'negative';
      return `${baseClass} ${valueClass}`;
    }
  };

  // Format point value with + or - sign
  const formatPoints = (points) => {
    return points >= 0 ? `+${points}` : `${points}`;
  };

  return (
    <button
      type="button"
      className={getButtonClass()}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`${display_name} ${formatPoints(point_value)} points${count > 0 ? `, selected ${count} times` : ''}`}
    >
      <span className="event-name">{display_name}</span>
      <span className="event-points">{formatPoints(point_value)}</span>
      {count > 0 && <span className="event-count">{count}</span>}
    </button>
  );
};

EventTypeButton.propTypes = {
  eventType: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    display_name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    point_value: PropTypes.number.isRequired
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  count: PropTypes.number
};

export default EventTypeButton;
