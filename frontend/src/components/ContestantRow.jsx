import '../styles/Dashboard.css';

const ContestantRow = ({ rank, name, profession, totalScore, isEliminated, imageUrl }) => {
  // Extract initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  // Get badge color based on rank
  const getBadgeColor = (rank) => {
    const colors = [
      '#FF6B35', // Orange
      '#4A90E2', // Blue
      '#27AE60', // Green
      '#9B59B6', // Purple
      '#E74C3C', // Red
    ];
    return colors[(rank - 1) % colors.length];
  };

  return (
    <div 
      className={`contestant-row ${isEliminated ? 'eliminated' : ''}`}
      role="listitem"
      aria-label={`Draft pick ${rank}: ${name}, ${profession}, ${totalScore} points, ${isEliminated ? 'eliminated' : 'active'}`}
    >
      <div 
        className="contestant-rank-badge" 
        style={{ backgroundColor: getBadgeColor(rank) }}
        aria-label={`Draft pick ${rank}`}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`${name}'s profile picture`}
            className="contestant-badge-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="contestant-initials"
          style={{ display: imageUrl ? 'none' : 'flex' }}
          aria-label={`${name} initials`}
        >
          {getInitials(name)}
        </div>
      </div>
      
      <div className="contestant-details">
        <h4 className="contestant-name">{name}</h4>
        <p className="contestant-profession">{profession}</p>
      </div>
      
      <div className="contestant-stats">
        <span className="contestant-points" aria-label={`${totalScore} points`}>
          {totalScore} <span className="pts-label" aria-hidden="true">pts</span>
        </span>
        <span 
          className={`contestant-status ${isEliminated ? 'status-eliminated' : 'status-active'}`}
          role="status"
          aria-label={`Status: ${isEliminated ? 'eliminated' : 'active'}`}
        >
          {isEliminated ? 'Eliminated' : 'Active'}
        </span>
      </div>
    </div>
  );
};

export default ContestantRow;
