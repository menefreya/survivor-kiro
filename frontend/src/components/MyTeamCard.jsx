import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContestantRow from './ContestantRow';
import ChangeSoleSurvivorModal from './ChangeSoleSurvivorModal';
import '../styles/07-pages/dashboard.css';

const MyTeamCard = ({ soleSurvivor, draftPicks, totalScore, error, onRetry, playerId }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChangeSoleSurvivor = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSoleSurvivorUpdated = () => {
    // Refresh the data by calling the retry function
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div className="dashboard-card my-team-card" role="region" aria-label="My Team">
      {/* Card Header */}
      <div className="card-header">
        <h2 id="my-team-title">My Team</h2>
        {!error && (soleSurvivor || (draftPicks && draftPicks.length > 0)) && (
          <div className="team-total-score">
            <span className="total-score-value">{totalScore}</span>
            <span className="total-score-label">pts</span>
          </div>
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
            <>
              <div className="sole-survivor-display" role="article" aria-label={`Sole survivor: ${soleSurvivor.name}`}>
                <div className="sole-survivor-left">
                  {soleSurvivor.image_url ? (
                    <img 
                      src={soleSurvivor.image_url} 
                      alt={`${soleSurvivor.name}'s profile picture`}
                      className="sole-survivor-image"
                      onError={(e) => {
                        e.target.classList.add('u-hidden');
                        e.target.nextElementSibling.classList.remove('u-hidden');
                        e.target.nextElementSibling.classList.add('u-flex');
                      }}
                    />
                  ) : null}
                  <div 
                    className={`sole-survivor-initials ${soleSurvivor.image_url ? 'u-hidden' : 'u-flex'}`}
                    aria-label={`${soleSurvivor.name} initials`}
                  >
                    {soleSurvivor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="sole-survivor-info">
                    <h4>{soleSurvivor.name}</h4>
                    <p className="profession">{soleSurvivor.profession}</p>
                  </div>
                </div>
                
                <div className="sole-survivor-stats">
                  <span className="sole-survivor-score" aria-label={`${soleSurvivor.total_score || 0} points`}>
                    {soleSurvivor.total_score || 0} <span className="pts-label" aria-hidden="true">pts</span>
                  </span>
                </div>
              </div>
              
              {/* Show Change Sole Survivor button when eliminated */}
              {soleSurvivor.is_eliminated && (
                <button 
                  className="change-sole-survivor-btn"
                  onClick={handleChangeSoleSurvivor}
                  aria-label="Change your sole survivor pick"
                >
                  Change Sole Survivor
                </button>
              )}
            </>
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
              {draftPicks.map((contestant) => (
                <div key={contestant.id} className="draft-pick-display" role="article" aria-label={`Draft pick: ${contestant.name}`}>
                  <div className="draft-pick-left">
                    {contestant.image_url ? (
                      <img 
                        src={contestant.image_url} 
                        alt={`${contestant.name}'s profile picture`}
                        className="draft-pick-image"
                        onError={(e) => {
                          e.target.classList.add('u-hidden');
                          e.target.nextElementSibling.classList.remove('u-hidden');
                          e.target.nextElementSibling.classList.add('u-flex');
                        }}
                      />
                    ) : null}
                    <div 
                      className={`draft-pick-initials ${contestant.image_url ? 'u-hidden' : 'u-flex'}`}
                      aria-label={`${contestant.name} initials`}
                    >
                      {contestant.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="draft-pick-info">
                      <h4>{contestant.name}</h4>
                      <p className="profession">{contestant.profession}</p>
                    </div>
                  </div>
                  
                  <div className="draft-pick-stats">
                    <span className="draft-pick-score" aria-label={`${contestant.total_score || 0} points`}>
                      {contestant.total_score || 0} <span className="pts-label" aria-hidden="true">pts</span>
                    </span>
                    {contestant.is_eliminated && (
                      <span
                        className="draft-pick-status status-eliminated"
                        role="status"
                        aria-label="Status: eliminated"
                      >
                        Eliminated
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        </>
        )}
      </div>

      {/* Change Sole Survivor Modal */}
      <ChangeSoleSurvivorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        currentSoleSurvivor={soleSurvivor}
        playerId={playerId}
        onSuccess={handleSoleSurvivorUpdated}
      />
    </div>
  );
};

export default MyTeamCard;
