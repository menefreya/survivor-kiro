import { memo } from 'react';

/**
 * Badge Component
 * 
 * Reusable badge component for status indicators, tribes, ranks, and other labels.
 * Uses the global badge system with semantic variants.
 */
const Badge = memo(({ 
  variant = 'default', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}) => {
  // Get variant class
  const getVariantClass = (variant) => {
    switch (variant) {
      case 'active':
        return 'badge--status-active';
      case 'eliminated':
        return 'badge--status-eliminated';
      case 'inactive':
        return 'badge--status-inactive';
      case 'tribe-kele':
        return 'badge--tribe-kele';
      case 'tribe-hina':
        return 'badge--tribe-hina';
      case 'tribe-uli':
        return 'badge--tribe-uli';
      case 'rank-gold':
        return 'badge--rank-gold';
      case 'rank-silver':
        return 'badge--rank-silver';
      case 'rank-bronze':
        return 'badge--rank-bronze';
      case 'rank-default':
        return 'badge--rank-default';
      case 'primary':
        return 'badge--primary';
      case 'success':
        return 'badge--success';
      case 'danger':
        return 'badge--danger';
      case 'warning':
        return 'badge--warning';
      case 'prediction-correct':
        return 'badge--prediction-correct';
      case 'prediction-incorrect':
        return 'badge--prediction-incorrect';
      case 'lock-locked':
        return 'badge--lock-locked';
      case 'lock-open':
        return 'badge--lock-open';
      case 'notification':
        return 'badge--notification';
      default:
        return '';
    }
  };

  // Get size class
  const getSizeClass = (size) => {
    switch (size) {
      case 'xs':
        return 'badge--xs';
      case 'sm':
        return 'badge--sm';
      case 'md':
        return 'badge--md';
      case 'lg':
        return 'badge--lg';
      case 'xl':
        return 'badge--xl';
      default:
        return 'badge--md';
    }
  };

  const variantClass = getVariantClass(variant);
  const sizeClass = getSizeClass(size);
  const baseClass = variantClass.includes('badge--status') || variantClass.includes('badge--tribe') || variantClass.includes('badge--prediction') || variantClass.includes('badge--lock') ? 'badge badge--status' : 'badge';

  return (
    <span 
      className={`${baseClass} ${sizeClass} ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;