import { memo } from 'react';
import Badge from './Badge';

/**
 * LockBadge Component
 * 
 * Specialized badge for lock status (locked, open, deadline)
 */
const LockBadge = memo(({ 
  status, 
  deadline = null, 
  size = 'sm', 
  showIcon = true, 
  className = '', 
  ...props 
}) => {
  // Map lock status to badge variant and display info
  const getLockConfig = (status, deadline) => {
    switch (status?.toLowerCase()) {
      case 'locked':
      case 'closed':
      case false:
        return {
          variant: 'lock-locked',
          text: showIcon ? '🔒 Locked' : 'Locked',
          icon: '🔒',
          ariaLabel: 'Locked - submissions closed',
          title: 'Submissions are locked and cannot be changed'
        };
      case 'open':
      case 'available':
      case true:
        return {
          variant: 'lock-open',
          text: showIcon ? '🔓 Open' : 'Open',
          icon: '🔓',
          ariaLabel: 'Open - submissions available',
          title: deadline ? `Submissions open until ${deadline}` : 'Submissions are open'
        };
      case 'deadline':
      case 'urgent':
        return {
          variant: 'warning',
          text: showIcon ? '⏰ Deadline Soon' : 'Deadline Soon',
          icon: '⏰',
          ariaLabel: 'Deadline approaching',
          title: deadline ? `Deadline: ${deadline}` : 'Deadline approaching - submit soon'
        };
      default:
        return {
          variant: 'inactive',
          text: showIcon ? '❓ Unknown' : 'Unknown',
          icon: '❓',
          ariaLabel: 'Status unknown',
          title: 'Lock status unknown'
        };
    }
  };

  const config = getLockConfig(status, deadline);

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

LockBadge.displayName = 'LockBadge';

export default LockBadge;