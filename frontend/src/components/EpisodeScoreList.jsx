import React from 'react';

/**
 * EpisodeScoreList Component
 * Displays a list of episodes with their events and scores
 */
function EpisodeScoreList({ episodes }) {
  if (!episodes || episodes.length === 0) {
    return <p className="no-episodes">No episode data available</p>;
  }

  return (
    <div className="episode-score-list">
      {episodes.map((episode) => (
        <div key={episode.episode_number} className="episode-item">
          <div className="episode-header">
            <span className="episode-number">Episode {episode.episode_number}</span>
            <span className="episode-total">
              {episode.total > 0 ? '+' : ''}{episode.total} pts
            </span>
          </div>
          
          {episode.events && episode.events.length > 0 ? (
            <div className="episode-events">
              {episode.events.map((event, index) => (
                <div key={index} className="event-item">
                  <span className="event-name">{event.display_name}</span>
                  <span className={`event-points ${event.points < 0 ? 'negative' : 'positive'}`}>
                    {event.points > 0 ? '+' : ''}{event.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-events">No events recorded</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default EpisodeScoreList;
