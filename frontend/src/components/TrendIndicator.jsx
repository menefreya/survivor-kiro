import { memo, useMemo } from 'react';

const TrendIndicator = memo(({ trend, className = '', contestantName = '' }) => {
  // Map trend values to icon names and colors
  const getTrendConfig = (trend) => {
    switch (trend) {
      case 'up':
        return {
          icon: 'trending_up',
          color: 'trend-up',
          label: 'Performance trending upward',
          description: 'Recent episodes show improved performance compared to earlier episodes',
          textDisplay: 'UP'
        };
      case 'down':
        return {
          icon: 'trending_down',
          color: 'trend-down',
          label: 'Performance trending downward',
          description: 'Recent episodes show decreased performance compared to earlier episodes',
          textDisplay: 'DOWN'
        };
      case 'same':
        return {
          icon: 'trending_flat',
          color: 'trend-same',
          label: 'Performance staying consistent',
          description: 'Recent performance is similar to earlier episodes',
          textDisplay: 'SAME'
        };
      case 'n/a':
      default:
        return {
          icon: null,
          color: 'trend-na',
          label: 'Performance trend not available',
          description: 'Not enough episode data to determine performance trend',
          textDisplay: 'N/A'
        };
    }
  };

  // Memoize trend configuration to avoid recalculation
  const config = useMemo(() => getTrendConfig(trend), [trend]);
  
  // Memoize aria label to avoid string concatenation on every render
  const fullAriaLabel = useMemo(() => {
    return contestantName 
      ? `${contestantName}'s ${config.label}. ${config.description}`
      : `${config.label}. ${config.description}`;
  }, [contestantName, config.label, config.description]);

  return (
    <div className="trend-container">
      <div 
        className={`trend-indicator trend-indicator--${config.color} ${className}`}
        aria-label={fullAriaLabel}
        role="img"
        title={config.description}
        tabIndex="0"
        onKeyDown={(e) => {
          // Announce trend details on Enter or Space
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Screen readers will re-announce the aria-label
            e.currentTarget.focus();
          }
        }}
      >
        {config.icon && (
          <span 
            className="material-icons trend-icon" 
            aria-hidden="true"
            role="presentation"
          >
            {config.icon}
          </span>
        )}
        <span 
          className="trend-text" 
          aria-hidden="true"
          role="presentation"
        >
          {config.textDisplay}
        </span>
        {/* Hidden text for screen readers with more context */}
        <span className="sr-only">
          {config.description}
        </span>
      </div>
    </div>
  );
});

// Display name for debugging
TrendIndicator.displayName = 'TrendIndicator';

export default TrendIndicator;