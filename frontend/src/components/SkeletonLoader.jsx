import '../styles/07-pages/dashboard.css';

// Skeleton loader for LeaderboardCard
export const LeaderboardSkeleton = () => {
  return (
    <div className="card leaderboard-card">
      <div className="layout-section-header">
        <div className="skeleton skeleton-title"></div>
      </div>
      <div className="layout-section-body">
        <div className="leaderboard-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-row"></div>
          ))}
        </div>
      </div>
      <div className="layout-section-footer">
        <div className="skeleton skeleton-text skeleton-text--40"></div>
        <div className="skeleton skeleton-text skeleton-text--40"></div>
      </div>
    </div>
  );
};

// Skeleton loader for MyTeamCard
export const MyTeamSkeleton = () => {
  return (
    <div className="dashboard-card my-team-card">
      <div className="layout-section-header">
        <div className="skeleton skeleton-title"></div>
      </div>
      <div className="layout-section-body">
        {/* Sole Survivor Section Skeleton */}
        <div className="team-section sole-survivor-section">
          <div className="section-header">
            <div className="skeleton skeleton-text skeleton-text--60"></div>
          </div>
          <div className="skeleton skeleton-row"></div>
        </div>

        {/* Draft Picks Section Skeleton */}
        <div className="team-section draft-picks-section">
          <div className="section-header">
            <div className="skeleton skeleton-text skeleton-text--40"></div>
          </div>
          <div className="draft-picks-list">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton skeleton-row"></div>
            ))}
          </div>
        </div>

        {/* Total Score Section Skeleton */}
        <div className="team-section total-score-section">
          <div className="skeleton skeleton-row"></div>
        </div>
      </div>
    </div>
  );
};
