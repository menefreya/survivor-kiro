import { useState, memo } from 'react';
import TrendIndicator from './TrendIndicator';
import { RankBadge } from './badges';

const ContestantPerformanceRow = memo(({ contestant }) => {
  // Extract contestant data with defaults
  const {
    name,
    image_url,
    total_score = 0,
    average_per_episode = 0,
    trend = 'n/a',
    episodes_participated = 0,
    rank,
    profession,
    age,
    is_eliminated = false
  } = contestant;

  // State for image loading
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!image_url);

  // Get initials from name for fallback avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get first name only
  const getFirstName = (name) => {
    if (!name) return '';
    return name.split(' ')[0];
  };

  // All rank badges use the same styling
  const getRankBadgeColor = (rank) => {
    return 'rank-badge-default';
  };

  // Format average to one decimal place
  const formatAverage = (avg) => {
    if (avg === 0 || episodes_participated === 0) return 'N/A';
    return avg.toFixed(1);
  };

  // Format total score to ensure it shows 0 for unscored contestants
  const formatTotalScore = (score) => {
    return score || 0;
  };

  // Handle image loading success
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Handle image loading error with retry logic
  const handleImageError = (e) => {
    setImageLoading(false);
    setImageError(true);
    
    // Hide the failed image and show fallback
    e.target.style.display = 'none';
    const fallback = e.target.nextElementSibling;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  };

  // Retry image loading
  const retryImageLoad = (e) => {
    e.preventDefault();
    if (!image_url) return;
    
    setImageError(false);
    setImageLoading(true);
    
    // Create a new image element to test loading
    const img = new Image();
    img.onload = () => {
      // If successful, update the main image
      const mainImg = e.target.closest('.entity-row__avatar').querySelector('.avatar__image');
      if (mainImg) {
        mainImg.src = image_url;
        mainImg.style.display = 'block';
        e.target.closest('.contestant-initials').style.display = 'none';
      }
      setImageLoading(false);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoading(false);
      setImageError(true);
    };
    img.src = image_url;
  };

  return (
    <tr 
      className="u-border-b u-border-subtle u-transition-colors hover:u-bg-tertiary"
      role="row"
      tabIndex="0"
      aria-label={`Rank ${rank}: ${getFirstName(name)}${profession ? `, ${profession}` : ''}${age ? `, age ${age}` : ''}, ${formatTotalScore(total_score)} total points, ${formatAverage(average_per_episode)} average per episode, performance trending ${trend}`}
      onKeyDown={(e) => {
        // Allow Enter and Space to activate row (for future interactions)
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Future: Could open detailed view or perform action
        }
      }}
    >
      {/* Rank */}
      <td 
        className="u-p-4"
        role="cell"
        aria-label={`Rank ${rank}${rank <= 3 ? (rank === 1 ? ' - First place' : rank === 2 ? ' - Second place' : ' - Third place') : ''}`}
      >
        <RankBadge rank={rank} size="lg" />
      </td>

      {/* Contestant Info */}
      <td className="u-p-4" role="cell">
        <div className="entity-row entity-row--compact">
          <div className="avatar avatar--lg">
            {image_url && !imageError ? (
              <>
              <img 
                src={image_url} 
                alt={`Profile photo of ${getFirstName(name)}`}
                className="avatar__image"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
              {imageLoading && (
                <div className="u-animate-pulse u-bg-tertiary u-w-full u-h-full u-rounded-full" aria-label="Loading profile image">
                </div>
              )}
            </>
          ) : null}
          
          <div 
            className={`avatar__initials ${image_url && !imageError && !imageLoading ? 'u-hidden' : 'u-flex'}`}
            aria-label={`${getFirstName(name)} profile avatar${imageError ? ' (image failed to load)' : ''} showing initials ${getInitials(name)}`}
            role="img"
          >
            {getInitials(name)}
            
            {/* Retry button for failed images */}
            {imageError && image_url && (
              <button
                className="u-absolute u-bottom-0 u-right-0 u-w-4 u-h-4 u-rounded-full u-border u-border-medium u-bg-secondary u-text-secondary u-text-xs u-cursor-pointer u-flex u-items-center u-justify-center u-transition-colors hover:u-bg-tertiary hover:u-text-primary"
                onClick={retryImageLoad}
                aria-label={`Retry loading profile image for ${getFirstName(name)}`}
                title="Click to retry loading image"
              >
                ↻
              </button>
            )}
          </div>
          </div>
          <div className="entity-row__info">
            <div className="u-flex u-items-center u-gap-2">
              <h4 className="entity-row__name" id={`contestant-${contestant.id}-name`}>
                {getFirstName(name)}
              </h4>
              {is_eliminated && (
                <span className="badge badge--sm badge--danger" aria-label="This contestant has been eliminated">
                  ☠️
                </span>
              )}
            </div>
            {(profession || age) && (
              <div className="u-flex u-items-center u-gap-1 u-mt-1">
                {profession && (
                  <span className="u-text-xs u-text-secondary">{profession}</span>
                )}
                {profession && age && (
                  <span className="u-text-xs u-text-muted">•</span>
                )}
                {age && (
                  <span className="u-text-xs u-text-secondary">{age}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Total Score */}
      <td 
        className="u-p-4 u-text-center" 
        role="cell"
        aria-label={`Total score: ${formatTotalScore(total_score)} points`}
        aria-describedby={`contestant-${contestant.id}-name`}
      >
        <span className="u-text-lg u-font-semibold u-text-primary" aria-hidden="true">
          {formatTotalScore(total_score)}
        </span>
      </td>

      {/* Average Per Episode */}
      <td 
        className="u-p-4 u-text-center" 
        role="cell"
        aria-label={`Average per episode: ${formatAverage(average_per_episode)}${formatAverage(average_per_episode) !== 'N/A' ? ' points' : ''}`}
        aria-describedby={`contestant-${contestant.id}-name`}
      >
        <span className="u-text-base u-text-secondary" aria-hidden="true">
          {formatAverage(average_per_episode)}
        </span>
      </td>

      {/* Trend Indicator */}
      <td 
        className="u-p-4 u-text-center" 
        role="cell"
        aria-label={`Performance trend: ${trend === 'n/a' ? 'not available' : trend === 'same' ? 'staying the same' : `trending ${trend}`}`}
        aria-describedby={`contestant-${contestant.id}-name`}
      >
        <TrendIndicator trend={trend} contestantName={getFirstName(name)} />
      </td>
    </tr>
  );
});

// Display name for debugging
ContestantPerformanceRow.displayName = 'ContestantPerformanceRow';

export default ContestantPerformanceRow;