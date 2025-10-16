import { memo, useMemo } from 'react';

const TrendIndicator = memo(({ trend, className = '', contestantName = '' }) => {
  // Map trend values to arrow symbols and colors
  const getTrendConfig = (trend) => {
    switch (trend) {
      case 'up':
        return {
          arrow: '↗',
          color: 'u-text-success',
          label: 'Performance trending upward',
          description: 'Recent episodes show improved performance compared to earlier episodes'
        };
      case 'down':
        return {
          arrow: '↘',
          color: 'u-text-danger',
          label: 'Performance trending downward',
          description: 'Recent episodes show decreased performance compared to earlier episodes'
        };
      case 'same':
        return {
          arrow: '→',
          color: 'u-text-primary',
          label: 'Performance staying consistent',
          description: 'Recent performance is similar to earlier episodes'
        };
      case 'n/a':
      default:
        return {
          arrow: '—',
          color: 'u-text-muted',
          label: 'Performance trend not available',
          description: 'Not enough episode data to determine performance trend'
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
    <div 
      className={`u-text-lg u-font-bold ${config.color} ${className}`}
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
      {config.arrow}
      {/* Hidden text for screen readers with more context */}
      <span className="u-sr-only">
        {config.description}
      </span>
    </div>
  );
});

// Display name for debugging
TrendIndicator.displayName = 'TrendIndicator';

export default TrendIndicator;