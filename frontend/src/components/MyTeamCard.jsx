import { useNavigate } from 'react-router-dom';
import ContestantRow from './ContestantRow';
import '../styles/Dashboard.css';

const MyTeamCard = ({ soleSurvivor, draftPicks, totalScore, weeklyChange, error, onRetry }) => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-card my-team-card" role="region" aria-label="My Team">
      {/* Card Header */}
      <div className="card-header">
        <h2 id="my-team-title">My Team</h2>
        {!error && (
          <button 
            className="view-full-link"
            onClick={() => navigate('/profile')}
            aria-label="View full team details on profile page"
          >
            View Full Team →
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="card-body">
        {error ? (
          <div className="error-state" role="alert" aria-live="polite">
            <div className="error-message">
              {error}
            </div>
            {onRetry && (
              <button 
                className="retry-button" 
                onClick={onRetry}
                aria-label="Retry loading team data"
              >
                Retry
              </button>
            )}
          </div>
        ) : (!soleSurvivor && (!draftPicks || draftPicks.length === 0)) ? (
          // Complete empty state - no team data at all
          <div className="complete-empty-state" role="status">
            <div className="empty-state-icon" role="img" aria-label="Island emoji">🏝️</div>
            <h3 className="empty-state-title">Build Your Team</h3>
            <p className="empty-state-message">
              You haven't set up your team yet. Complete your rankings to join the competition!
            </p>
            <button 
              className="empty-state-button"
              onClick={() => navigate('/ranking')}
              aria-label="Go to ranking page to complete your team setup"
            >
              Complete Rankings →
            </button>
          </div>
        ) : (
          <>
        {/* Sole Survivor Section */}
        <div className="team-section sole-survivor-section" role="region" aria-labelledby="sole-survivor-heading">
          <div className="section-header">
            <span className="crown-icon" role="img" aria-label="Crown icon">👑</span>
            <h3 id="sole-survivor-heading">Sole Survivor Pick</h3>
          </div>
          
          {!soleSurvivor ? (
            <div className="empty-state" role="status">
              <div className="empty-state-content">
                <span className="crown-icon-large" role="img" aria-label="Crown icon">👑</span>
                <p className="empty-state-text">No sole survivor selected</p>
                <button 
                  className="select-winner-btn"
                  onClick={() => navigate('/ranking')}
                  aria-label="Go to ranking page to select your sole survivor winner"
                >
                  Select your winner →
                </button>
              </div>
            </div>
          ) : (
            <div className="sole-survivor-display" role="article" aria-label={`Sole survivor: ${soleSurvivor.name}`}>
              {soleSurvivor.image_url ? (
                <img 
                  src={soleSurvivor.image_url} 
                  alt={`${soleSurvivor.name}'s profile picture`}
                  className="sole-survivor-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="sole-survivor-initials"
                style={{ display: soleSurvivor.image_url ? 'none' : 'flex' }}
                aria-label={`${soleSurvivor.name} initials`}
              >
                {soleSurvivor.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="sole-survivor-info">
                <h4>{soleSurvivor.name}</h4>
                <p className="profession">{soleSurvivor.profession}</p>
                {soleSurvivor.is_eliminated && (
                  <span className="eliminated-badge" role="status" aria-label="This contestant has been eliminated">
                    Eliminated
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Draft Picks Section */}
        <div className="team-section draft-picks-section" role="region" aria-labelledby="draft-picks-heading">
          <div className="section-header">
            <h3 id="draft-picks-heading">Draft Picks</h3>
          </div>
          
          {!draftPicks || draftPicks.length === 0 ? (
            <div className="empty-state" role="status">
              <p className="empty-state-text">No draft picks yet</p>
            </div>
          ) : (
            <div className="draft-picks-list" role="list" aria-labelledby="draft-picks-heading">
              {draftPicks.map((contestant, index) => (
                <ContestantRow
                  key={contestant.id}
                  rank={index + 1}
                  name={contestant.name}
                  profession={contestant.profession}
                  totalScore={contestant.total_score}
                  isEliminated={contestant.is_eliminated}
                  imageUrl={contestant.image_url}
                />
              ))}
            </div>
          )}
        </div>

        {/* Total Team Score Section */}
        <div className="team-section total-score-section" role="region" aria-labelledby="total-score-heading">
          <div className="total-score-display">
            <span className="trophy-icon" role="img" aria-label="Trophy icon">🏆</span>
            <div className="total-score-content">
              <h3 id="total-score-heading">Total Team Score</h3>
              <div className="score-details">
                <span className="total-points" aria-label={`Total score: ${totalScore} points`}>
                  {totalScore} <span className="pts-label" aria-hidden="true">pts</span>
                </span>
                {weeklyChange !== undefined && weeklyChange !== 0 && (
                  <span className="weekly-change" aria-label={`Increased by ${weeklyChange} points this week`}>
                    <span className="up-arrow" role="img" aria-hidden="true">↑</span> +{weeklyChange} this week
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default MyTeamCard;
