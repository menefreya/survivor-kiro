import React from 'react';

/**
 * SoleSurvivorBonusBreakdown Component
 * Displays the breakdown of sole survivor bonus points
 */
function SoleSurvivorBonusBreakdown({ bonus, history, currentEpisode }) {
  if (!bonus || bonus.total_bonus === 0) {
    return null;
  }

  return (
    <div className="sole-survivor-bonus-breakdown">
      <h4>Sole Survivor Bonus</h4>
      
      <div className="bonus-summary">
        <div className="bonus-item">
          <span className="bonus-label">Episode Bonus:</span>
          <span className="bonus-value">
            {bonus.episode_count} {bonus.episode_count === 1 ? 'episode' : 'episodes'} × 1 pt = +{bonus.episode_bonus} pts
          </span>
        </div>
        
        {bonus.winner_bonus > 0 && (
          <div className="bonus-item winner-bonus">
            <span className="bonus-label">Winner Bonus:</span>
            <span className="bonus-value">+{bonus.winner_bonus} pts</span>
            <p className="bonus-explanation">
              Selected in episode {history?.start_episode || 1} or earlier and contestant won!
            </p>
          </div>
        )}
        
        <div className="bonus-total">
          <span className="bonus-label">Total Bonus:</span>
          <span className="bonus-value">+{bonus.total_bonus} pts</span>
        </div>
      </div>

      {history && (
        <div className="selection-history">
          <h5>Selection Period</h5>
          <p className="history-detail">
            Episodes {history.start_episode} - {history.end_episode || currentEpisode || 'Current'}
            {!history.end_episode && ' (Active)'}
          </p>
          <p className="contiguous-explanation">
            Bonus calculated from most recent contiguous selection period.
          </p>
        </div>
      )}
    </div>
  );
}

export default SoleSurvivorBonusBreakdown;
