import '../styles/Dashboard.css';

const PlayerRow = ({ 
  rank, 
  playerName, 
  username, 
  profileImageUrl,
  totalScore, 
  weeklyChange, 
  isCurrentUser 
}) => {
  // Determine rank badge color based on position
  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return 'rank-badge-gold';
      case 2:
        return 'rank-badge-silver';
      case 3:
        return 'rank-badge-bronze';
      default:
        return 'rank-badge-blue';
    }
  };

  // Get first letter of player name for avatar
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div 
      className={`player-row ${isCurrentUser ? 'current-user' : ''}`}
      role="listitem"
      aria-label={`${isCurrentUser ? 'Your team: ' : ''}Rank ${rank}, ${playerName}, ${totalScore} points${weeklyChange > 0 ? `, up ${weeklyChange} this week` : ''}`}
    >
      {/* Rank Badge */}
      <div 
        className={`rank-badge ${getRankBadgeColor(rank)}`}
        aria-label={`Rank ${rank}`}
        role="img"
      >
        {rank}
      </div>

      {/* Player Avatar */}
      <div className="player-avatar">
        {profileImageUrl ? (
          <img 
            src={profileImageUrl} 
            alt={`${playerName}'s profile picture`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : (
          <div className="avatar-initial" aria-label={`${playerName} avatar`}>
            {getInitial(playerName)}
          </div>
        )}
        <div className="avatar-initial" style={{ display: 'none' }} aria-label={`${playerName} avatar`}>
          {getInitial(playerName)}
        </div>
      </div>

      {/* Player Info */}
      <div className="player-info">
        <div className="player-name">{playerName}</div>
        <div className="player-username">@{username}</div>
      </div>

      {/* Score */}
      <div className="player-score" aria-label={`${totalScore} points`}>
        <div className="score-value">{totalScore}</div>
        <div className="score-label" aria-hidden="true">pts</div>
      </div>

      {/* Weekly Change */}
      {weeklyChange !== undefined && weeklyChange !== null && weeklyChange > 0 && (
        <div className="weekly-change" aria-label={`Increased by ${weeklyChange} points this week`}>
          <span className="change-arrow" aria-hidden="true" role="img">↑</span>
          <span className="change-value">+{weeklyChange}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerRow;
