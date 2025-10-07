import { useState, memo } from 'react';
import TrendIndicator from './TrendIndicator';

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
    profession
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
      const mainImg = e.target.closest('.contestant-avatar').querySelector('.contestant-image');
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
      className="contestant-performance-row"
      role="row"
      tabIndex="0"
      aria-label={`Rank ${rank}: ${getFirstName(name)}, ${formatTotalScore(total_score)} total points, ${formatAverage(average_per_episode)} average per episode, performance trending ${trend}`}
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
        className={`contestant-rank ${getRankBadgeColor(rank)}`}
        role="cell"
        aria-label={`Rank ${rank}${rank <= 3 ? (rank === 1 ? ' - First place' : rank === 2 ? ' - Second place' : ' - Third place') : ''}`}
      >
        <span className="rank-number" aria-hidden="true">{rank}</span>
      </td>

      {/* Contestant Info */}
      <td className="contestant-info" role="cell">
        <div className="contestant-info-content">
          <div className="contestant-avatar">
            {image_url && !imageError ? (
              <>
                <img 
                  src={image_url} 
                  alt={`Profile photo of ${getFirstName(name)}`}
                  className="contestant-image"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
                {imageLoading && (
                  <div className="contestant-image-loading" aria-label="Loading profile image">
                    <div className="skeleton skeleton-avatar"></div>
                  </div>
                )}
              </>
            ) : null}
            
            <div 
              className={`contestant-initials ${image_url && !imageError && !imageLoading ? 'u-hidden' : 'u-flex'}`}
              aria-label={`${getFirstName(name)} profile avatar${imageError ? ' (image failed to load)' : ''} showing initials ${getInitials(name)}`}
              role="img"
            >
              {getInitials(name)}
              
              {/* Retry button for failed images */}
              {imageError && image_url && (
                <button
                  className="image-retry-btn"
                  onClick={retryImageLoad}
                  aria-label={`Retry loading profile image for ${getFirstName(name)}`}
                  title="Click to retry loading image"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-border-medium)',
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-colors)',
                    zIndex: '1'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--color-bg-tertiary)';
                    e.target.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--color-bg-secondary)';
                    e.target.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  ↻
                </button>
              )}
            </div>
          </div>
          <div className="contestant-details">
            <h4 className="contestant-name" id={`contestant-${contestant.id}-name`}>
              {getFirstName(name)}
            </h4>
          </div>
        </div>
      </td>

      {/* Total Score */}
      <td 
        className="contestant-total-score" 
        role="cell"
        aria-label={`Total score: ${formatTotalScore(total_score)} points`}
        aria-describedby={`contestant-${contestant.id}-name`}
      >
        <div className="score-container">
          <span className="score-value" aria-hidden="true">{formatTotalScore(total_score)}</span>
        </div>
      </td>

      {/* Average Per Episode */}
      <td 
        className="contestant-average" 
        role="cell"
        aria-label={`Average per episode: ${formatAverage(average_per_episode)}${formatAverage(average_per_episode) !== 'N/A' ? ' points' : ''}`}
        aria-describedby={`contestant-${contestant.id}-name`}
      >
        <div className="average-container">
          <span className="average-value" aria-hidden="true">{formatAverage(average_per_episode)}</span>
        </div>
      </td>

      {/* Trend Indicator */}
      <td 
        className="contestant-trend" 
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