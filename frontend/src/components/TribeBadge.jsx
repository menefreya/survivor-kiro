import { memo } from 'react';
import Badge from './Badge';

/**
 * TribeBadge Component
 * 
 * Specialized badge for tribe affiliation (Kele, Hina, Uli)
 */
const TribeBadge = memo(({ tribe, size = 'sm', showIcon = false, className = '', ...props }) => {
  // Map tribe to badge variant and display info
  const getTribeConfig = (tribe) => {
    const tribeName = tribe?.toLowerCase();
    
    switch (tribeName) {
      case 'kele':
        return {
          variant: 'tribe-kele',
          text: 'Kele',
          icon: '🔵',
          ariaLabel: 'Kele tribe member',
          color: 'Blue'
        };
      case 'hina':
        return {
          variant: 'tribe-hina',
          text: 'Hina',
          icon: '🟡',
          ariaLabel: 'Hina tribe member',
          color: 'Yellow'
        };
      case 'uli':
        return {
          variant: 'tribe-uli',
          text: 'Uli',
          icon: '🔴',
          ariaLabel: 'Uli tribe member',
          color: 'Red'
        };
      default:
        return {
          variant: 'inactive',
          text: tribe || 'No Tribe',
          icon: '⚪',
          ariaLabel: 'No tribe assigned',
          color: 'Gray'
        };
    }
  };

  const config = getTribeConfig(tribe);

  return (
    <Badge 
      variant={config.variant}
      size={size}
      className={className}
      aria-label={config.ariaLabel}
      title={`${config.text} Tribe (${config.color})`}
      {...props}
    >
      {showIcon && <span className="u-mr-1" aria-hidden="true">{config.icon}</span>}
      {config.text}
    </Badge>
  );
});

TribeBadge.displayName = 'TribeBadge';

export default TribeBadge;