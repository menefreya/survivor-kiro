import { memo } from 'react';
import Badge from './Badge';

/**
 * RankBadge Component
 * 
 * Specialized badge for ranking positions with special styling for top 3
 */
const RankBadge = memo(({ rank, size = 'lg', showIcon = true, className = '', ...props }) => {
  // Map rank to badge variant and display info
  const getRankConfig = (rank) => {
    const rankNum = parseInt(rank);
    
    if (rankNum === 1) {
      return {
        variant: 'rank-gold',
        text: '1',
        icon: '🥇',
        ariaLabel: 'First place',
        title: 'First Place - Gold Medal'
      };
    } else if (rankNum === 2) {
      return {
        variant: 'rank-silver',
        text: '2',
        icon: '🥈',
        ariaLabel: 'Second place',
        title: 'Second Place - Silver Medal'
      };
    } else if (rankNum === 3) {
      return {
        variant: 'rank-bronze',
        text: '3',
        icon: '🥉',
        ariaLabel: 'Third place',
        title: 'Third Place - Bronze Medal'
      };
    } else if (rankNum > 0) {
      return {
        variant: 'rank-default',
        text: rankNum.toString(),
        icon: null,
        ariaLabel: `Rank ${rankNum}`,
        title: `Rank ${rankNum}`
      };
    } else {
      return {
        variant: 'rank-default',
        text: '—',
        icon: null,
        ariaLabel: 'Unranked',
        title: 'No rank assigned'
      };
    }
  };

  const config = getRankConfig(rank);

  return (
    <Badge 
      variant={config.variant}
      size={size}
      className={className}
      aria-label={config.ariaLabel}
      title={config.title}
      {...props}
    >
      {showIcon && config.icon && (
        <span className="u-mr-1" aria-hidden="true">{config.icon}</span>
      )}
      {config.text}
    </Badge>
  );
});

RankBadge.displayName = 'RankBadge';

export default RankBadge;