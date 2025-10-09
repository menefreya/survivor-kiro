import '../styles/07-pages/dashboard.css';

const ContestantRow = ({
  contestant,
  showCrown = false,
  isSoleSurvivor = false,
  customStats = null, // Custom content to replace the default stats area
  // Legacy props for backward compatibility
  rank,
  name,
  profession,
  totalScore,
  isEliminated,
  imageUrl
}) => {
  // Use contestant object if provided, otherwise fall back to individual props
  const contestantData = contestant || {
    id: rank,
    name,
    profession,
    total_score: totalScore,
    is_eliminated: isEliminated,
    image_url: imageUrl
  };

  // Extract initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  // Get badge color class based on rank or type
  const getBadgeColorClass = (rank) => {
    if (isSoleSurvivor) {
      return 'contestant-badge--sole-survivor';
    }
    const colorClasses = [
      'contestant-badge--primary',    // Orange
      'contestant-badge--secondary',  // Blue
      'contestant-badge--success',    // Green
      'contestant-badge--info',       // Purple
      'contestant-badge--danger',     // Red
    ];
    return colorClasses[(rank - 1) % colorClasses.length];
  };

  return (
    <div
      className={`contestant-row ${contestantData.is_eliminated ? 'eliminated' : ''} ${isSoleSurvivor ? 'sole-survivor' : ''}`}
      role="listitem"
      aria-label={`${isSoleSurvivor ? 'Sole survivor' : 'Draft pick'}: ${contestantData.name}, ${contestantData.profession}, ${contestantData.total_score || 0} points${contestantData.is_eliminated ? ', eliminated' : ''}`}
    >
      <div className="contestant-left">
        <div
          className={`contestant-avatar ${getBadgeColorClass(rank)}`}
          aria-label={isSoleSurvivor ? 'Sole survivor' : `Draft pick ${rank || ''}`}
        >
          {contestantData.image_url ? (
            <img
              src={contestantData.image_url}
              alt={`${contestantData.name}'s profile picture`}
              className="contestant-avatar-image"
              onError={(e) => {
                e.target.classList.add('u-hidden');
                e.target.nextElementSibling.classList.remove('u-hidden');
                e.target.nextElementSibling.classList.add('u-flex');
              }}
            />
          ) : null}
          <div
            className={`contestant-initials ${contestantData.image_url ? 'u-hidden' : 'u-flex'}`}
            aria-label={`${contestantData.name} initials`}
          >
            {getInitials(contestantData.name)}
          </div>
        </div>

        <div className="contestant-details">
          <div className="contestant-name-wrapper">
            {showCrown && (
              <span className="crown-icon" role="img" aria-label="Sole survivor crown">👑</span>
            )}
            <h4 className="contestant-name">{contestantData.name}</h4>
          </div>
          <p className="contestant-profession">{contestantData.profession}</p>
        </div>
      </div>

      <div className="contestant-stats">
        {customStats ? (
          customStats
        ) : (
          <>
            <span className="contestant-points" aria-label={`${contestantData.total_score || 0} points`}>
              {contestantData.total_score || 0} <span className="pts-label" aria-hidden="true">pts</span>
            </span>
            {contestantData.is_eliminated && (
              <span
                className="contestant-status status-eliminated"
                role="status"
                aria-label="Status: eliminated"
              >
                Eliminated
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContestantRow;
