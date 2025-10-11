import { memo } from 'react';
import Badge from './Badge';

/**
 * PredictionBadge Component
 * 
 * Specialized badge for prediction results (correct, incorrect, pending)
 */
const PredictionBadge = memo(({ 
  result, 
  points = null, 
  size = 'sm', 
  showPoints = true, 
  className = '', 
  ...props 
}) => {
  // Map prediction result to badge variant and display info
  const getPredictionConfig = (result, points) => {
    if (result === true || result === 'correct') {
      return {
        variant: 'prediction-correct',
        text: showPoints && points ? `✓ Correct (+${points})` : '✓ Correct',
        icon: '✓',
        ariaLabel: `Correct prediction${points ? `, earned ${points} points` : ''}`,
        title: `Correct Prediction${points ? ` - Earned ${points} points` : ''}`
      };
    } else if (result === false || result === 'incorrect') {
      return {
        variant: 'prediction-incorrect',
        text: '✗ Incorrect',
        icon: '✗',
        ariaLabel: 'Incorrect prediction',
        title: 'Incorrect Prediction - No points earned'
      };
    } else if (result === null || result === 'pending') {
      return {
        variant: 'warning',
        text: '⏳ Pending',
        icon: '⏳',
        ariaLabel: 'Prediction pending results',
        title: 'Prediction Pending - Results not yet available'
      };
    } else {
      return {
        variant: 'inactive',
        text: '— No Prediction',
        icon: '—',
        ariaLabel: 'No prediction made',
        title: 'No Prediction Made'
      };
    }
  };

  const config = getPredictionConfig(result, points);

  return (
    <Badge 
      variant={config.variant}
      size={size}
      className={className}
      aria-label={config.ariaLabel}
      title={config.title}
      role="status"
      {...props}
    >
      {config.text}
    </Badge>
  );
});

PredictionBadge.displayName = 'PredictionBadge';

export default PredictionBadge;