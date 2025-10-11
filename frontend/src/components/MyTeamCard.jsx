import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      <div className="layout-section-header">
        <h2 className="layout-section-header__title" id="my-team-title">My Team</h2>
        {!error && (soleSurvivor || (draftPicks && draftPicks.length > 0)) && (
          <div className="layout-section-header__actions">
            <div className="team-total-score">
              <span className="total-score-value">{totalScore}</span>
              <span className="total-score-label">pts</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="layout-section-body">
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
            {/* Combined Team List - Sole Survivor at top, then draft picks */}
            <div className="team-contestants-list" role="list" aria-labelledby="my-team-title">
              {/* Sole Survivor at the top with crown */}
              {soleSurvivor && (
                <ContestantRow
                  key={`sole-${soleSurvivor.id}`}
                  contestant={soleSurvivor}
                  showCrown={true}
                  isSoleSurvivor={true}
                />
              )}
              
              {/* Draft Picks */}
              {draftPicks && draftPicks.map((contestant) => (
                <ContestantRow
                  key={`draft-${contestant.id}`}
                  contestant={contestant}
                  showCrown={false}
                  isSoleSurvivor={false}
                />
              ))}
              
              {/* Show empty state if no contestants at all */}
              {!soleSurvivor && (!draftPicks || draftPicks.length === 0) && (
                <div className="empty-state" role="status">
                  <p className="empty-state-text">No team members yet</p>
                </div>
              )}
            </div>

            {/* Show Change Sole Survivor button when sole survivor is eliminated */}
            {soleSurvivor && soleSurvivor.is_eliminated && (
              <div className="team-actions">
                <button 
                  className="change-sole-survivor-btn"
                  onClick={handleChangeSoleSurvivor}
                  aria-label="Change your sole survivor pick"
                >
                  Change Sole Survivor
                </button>
              </div>
            )}

            {/* Draft Link */}
            <div className="team-draft-link">
              <Link 
                to="/ranking"
                className="draft-link"
                aria-label="View and update your draft rankings"
              >
                See Draft
              </Link>
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
