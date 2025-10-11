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



  return (
    <div
      className={`entity-row entity-row--interactive ${contestantData.is_eliminated ? 'eliminated' : ''} ${isSoleSurvivor ? 'sole-survivor' : ''}`}
      role="listitem"
      aria-label={`${isSoleSurvivor ? 'Sole survivor' : 'Draft pick'}: ${contestantData.name}, ${contestantData.profession}, ${contestantData.total_score || 0} points${contestantData.is_eliminated ? ', eliminated' : ''}`}
    >
      <div className="entity-row__avatar">
        <div className="avatar avatar--lg">
          {contestantData.image_url ? (
            <img
              src={contestantData.image_url}
              alt={`${contestantData.name}'s profile picture`}
              className="avatar__image"
              onError={(e) => {
                e.target.classList.add('u-hidden');
                e.target.nextElementSibling.classList.remove('u-hidden');
                e.target.nextElementSibling.classList.add('u-flex');
              }}
            />
          ) : null}
          <div
            className={`avatar__initials ${contestantData.image_url ? 'u-hidden' : 'u-flex'}`}
            aria-label={`${contestantData.name} initials`}
          >
            {getInitials(contestantData.name)}
          </div>
        </div>
      </div>

      <div className="entity-row__info">
        <div className="entity-row__name-wrapper">
          {showCrown && (
            <span className="crown-icon" role="img" aria-label="Sole survivor crown">👑</span>
          )}
          <h4 className="entity-row__name">{contestantData.name}</h4>
        </div>
        <p className="entity-row__subtitle">{contestantData.profession}</p>
      </div>

      <div className="entity-row__stats">
        {customStats ? (
          customStats
        ) : (
          <>
            <div className="entity-row__score" aria-label={`${contestantData.total_score || 0} points`}>
              {contestantData.total_score || 0}
            </div>
            <div className="entity-row__score-label" aria-hidden="true">pts</div>
            {contestantData.is_eliminated && (
              <span
                className="badge badge--status badge--status-eliminated"
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
