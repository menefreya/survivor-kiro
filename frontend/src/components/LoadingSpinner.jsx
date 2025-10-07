import React from 'react';

/**
 * Loading Spinner Component
 * @param {Object} props
 * @param {string} props.size - Size of spinner: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.text - Optional loading text to display
 * @param {boolean} props.centered - Whether to center in a container (default: false)
 * @param {string} props.role - ARIA role (default: 'status')
 * @param {string} props['aria-live'] - ARIA live region (default: 'polite')
 */
const LoadingSpinner = ({ 
  size = 'md', 
  text, 
  centered = false,
  role = 'status',
  'aria-live': ariaLive = 'polite'
}) => {
  const spinnerClass = `spinner ${size !== 'md' ? `spinner-${size}` : ''}`;

  if (centered) {
    return (
      <div className="loading-container" role={role} aria-live={ariaLive}>
        <div className={spinnerClass} aria-hidden="true"></div>
        {text && <p className="loading-text">{text}</p>}
        <span className="visually-hidden">{text || 'Loading content, please wait'}</span>
      </div>
    );
  }

  return (
    <div className="loading-spinner-container" role={role} aria-live={ariaLive}>
      <div className={spinnerClass} aria-hidden="true"></div>
      {text && <span className="loading-text">{text}</span>}
      <span className="visually-hidden">{text || 'Loading content, please wait'}</span>
    </div>
  );
};

export default LoadingSpinner;
