import PlayerRow from './PlayerRow';
import '../styles/Dashboard.css';

const LeaderboardCard = ({ players, userPosition, pointsBehindLeader, currentUserId, error, onRetry }) => {
  return (
    <div className="card leaderboard-card" role="region" aria-label="Leaderboard">
      {/* Card Header */}
      <div className="card-header">
        <h2 id="leaderboard-title">Leaderboard</h2>
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
                aria-label="Retry loading leaderboard"
              >
                Retry
              </button>
            )}
          </div>
        ) : players.length === 0 ? (
          <p className="empty-state" role="status">No players in the league yet.</p>
        ) : (
          <div className="leaderboard-list" role="list" aria-labelledby="leaderboard-title">
            {players.map((player, index) => (
              <PlayerRow
                key={player.player_id}
                rank={index + 1}
                playerName={player.player_name}
                username={player.username || player.email?.split('@')[0] || 'player'}
                profileImageUrl={player.profile_image_url}
                totalScore={player.total_score}
                weeklyChange={player.weekly_change}
                isCurrentUser={player.player_id === currentUserId}
                draftedContestants={player.drafted_contestants || []}
                soleSurvivor={player.sole_survivor}
                predictionBonus={player.prediction_bonus || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      {!error && (
        <div className="card-footer">
          {userPosition > 0 && (
            <div className="user-stats" role="status" aria-live="polite">
              <span className="user-position" aria-label={`Your position is rank ${userPosition}`}>
                Your Position: #{userPosition}
              </span>
              <span className="points-behind" aria-label={`You are ${pointsBehindLeader} points behind the leader`}>
                Points Behind Leader: {pointsBehindLeader} pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardCard;
