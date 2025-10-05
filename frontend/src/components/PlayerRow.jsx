import { useState } from 'react';
import '../styles/Dashboard.css';

const PlayerRow = ({ 
  rank, 
  playerName, 
  username, 
  profileImageUrl,
  totalScore, 
  weeklyChange, 
  isCurrentUser,
  draftedContestants,
  soleSurvivor,
  predictionBonus
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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

  // Get initials from full name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const hasTeam = (draftedContestants && draftedContestants.length > 0) || soleSurvivor;

  const toggleExpand = () => {
    if (hasTeam) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div 
      className={`player-row-container ${isCurrentUser ? 'current-user' : ''}`}
      role="listitem"
    >
      <div 
        className={`player-row ${hasTeam ? 'expandable' : ''} ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleExpand}
        role={hasTeam ? 'button' : undefined}
        tabIndex={hasTeam ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasTeam && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleExpand();
          }
        }}
        aria-expanded={hasTeam ? isExpanded : undefined}
        aria-label={`${isCurrentUser ? 'Your team: ' : ''}Rank ${rank}, ${playerName}, ${totalScore} points${weeklyChange > 0 ? `, up ${weeklyChange} this week` : ''}${hasTeam ? '. Click to view team details.' : ''}`}
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

        {/* Prediction Bonus Indicator */}
        {predictionBonus > 0 && (
          <div 
            className="prediction-bonus-indicator"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={`Prediction bonus: ${predictionBonus} points`}
          >
            <span className="bonus-icon" role="img" aria-hidden="true">🎯</span>
            <span className="bonus-value">+{predictionBonus}</span>
            {showTooltip && (
              <div className="bonus-tooltip" role="tooltip">
                Prediction Bonus: +{predictionBonus} pts
              </div>
            )}
          </div>
        )}

        {/* Expand Icon */}
        {hasTeam && (
          <div className="expand-icon" aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </div>
        )}
      </div>

      {/* Expanded Team Details */}
      {isExpanded && hasTeam && (
        <div className="player-team-details" role="region" aria-label={`${playerName}'s team details`}>
          {/* Sole Survivor */}
          {soleSurvivor && (
            <div className="team-detail-section">
              <div className="team-detail-header">
                <span className="crown-icon" role="img" aria-label="Crown">👑</span>
                <span className="team-detail-label">Sole Survivor</span>
              </div>
              <div className="team-member-row">
                <div className="team-member-left">
                  {soleSurvivor.image_url ? (
                    <img 
                      src={soleSurvivor.image_url} 
                      alt={`${soleSurvivor.name}'s profile`}
                      className="team-member-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="team-member-initials"
                    style={{ display: soleSurvivor.image_url ? 'none' : 'flex' }}
                  >
                    {getInitials(soleSurvivor.name)}
                  </div>
                  <div className="team-member-info">
                    <div className="team-member-name">{soleSurvivor.name}</div>
                    <div className="team-member-profession">{soleSurvivor.profession}</div>
                  </div>
                </div>
                <div className="team-member-stats">
                  <span className="team-member-score">{soleSurvivor.total_score || 0} pts</span>
                  <span className={`team-member-status ${soleSurvivor.is_eliminated ? 'status-eliminated' : 'status-active'}`}>
                    {soleSurvivor.is_eliminated ? 'Eliminated' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Draft Picks */}
          {draftedContestants && draftedContestants.length > 0 && (
            <div className="team-detail-section">
              <div className="team-detail-header">
                <span className="team-detail-label">Draft Picks</span>
              </div>
              {draftedContestants.map((contestant, index) => (
                <div key={contestant.id} className="team-member-row">
                  <div className="team-member-left">
                    {contestant.image_url ? (
                      <img 
                        src={contestant.image_url} 
                        alt={`${contestant.name}'s profile`}
                        className="team-member-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="team-member-initials"
                      style={{ display: contestant.image_url ? 'none' : 'flex' }}
                    >
                      {getInitials(contestant.name)}
                    </div>
                    <div className="team-member-info">
                      <div className="team-member-name">{contestant.name}</div>
                      <div className="team-member-profession">{contestant.profession}</div>
                    </div>
                  </div>
                  <div className="team-member-stats">
                    <span className="team-member-score">{contestant.total_score || 0} pts</span>
                    <span className={`team-member-status ${contestant.is_eliminated ? 'status-eliminated' : 'status-active'}`}>
                      {contestant.is_eliminated ? 'Eliminated' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerRow;
