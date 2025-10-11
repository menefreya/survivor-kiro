import React, { useState } from 'react';
import EpisodeScoreList from './EpisodeScoreList';

/**
 * ContestantScoreDetails Component
 * Displays detailed score breakdown for a single contestant
 * with expandable/collapsible episode list
 */
function ContestantScoreDetails({ contestant, episodes, isSoleSurvivor = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="contestant-score-details">
      <div className="contestant-header" onClick={toggleExpanded}>
        <div className="entity-row__info">
          {contestant.image_url && (
            <img 
              src={contestant.image_url} 
              alt={contestant.name}
              className="avatar avatar--lg"
            />
          )}
          <div className="entity-row__info">
            <h4>{contestant.name}</h4>
            {isSoleSurvivor && <span className="sole-survivor-badge">Sole Survivor</span>}
          </div>
        </div>
        <div className="contestant-total-score">
          <span className="score-value">{contestant.total_score} pts</span>
          <button 
            className="expand-toggle"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="contestant-episodes">
          <EpisodeScoreList episodes={episodes} />
        </div>
      )}
    </div>
  );
}

export default ContestantScoreDetails;
