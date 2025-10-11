import { memo } from 'react';
import Badge from './Badge';

/**
 * StatusBadge Component
 * 
 * Specialized badge for contestant status (active, eliminated, inactive)
 */
const StatusBadge = memo(({ status, size = 'sm', className = '', ...props }) => {
  // Map status to badge variant and text
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case true:
        return {
          variant: 'active',
          text: 'Active',
          ariaLabel: 'Active contestant'
        };
      case 'eliminated':
      case 'false':
      case false:
        return {
          variant: 'eliminated',
          text: 'Eliminated',
          ariaLabel: 'Eliminated contestant'
        };
      case 'inactive':
        return {
          variant: 'inactive',
          text: 'Inactive',
          ariaLabel: 'Inactive contestant'
        };
      default:
        return {
          variant: 'inactive',
          text: 'Unknown',
          ariaLabel: 'Unknown status'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      size={size}
      className={className}
      aria-label={config.ariaLabel}
      role="status"
      {...props}
    >
      {config.text}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;