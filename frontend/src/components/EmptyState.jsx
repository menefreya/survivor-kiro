import React from 'react';

/**
 * Empty State Component
 * @param {Object} props
 * @param {string} props.icon - Icon or emoji to display
 * @param {string} props.title - Title text
 * @param {string} props.description - Description text
 * @param {Object} props.action - Optional action button config { text, onClick }
 */
const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <div className="empty-state-action">
          <button 
            className="btn btn--primary" 
            onClick={action.onClick}
            type="button"
          >
            {action.text}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
