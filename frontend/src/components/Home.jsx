import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LeaderboardCard from './LeaderboardCard';
import MyTeamCard from './MyTeamCard';
import LoadingSpinner from './LoadingSpinner';
import '../App.css';
import '../styles/Dashboard.css';

const Home = () => {
  const { user } = useContext(AuthContext);
  const [myTeam, setMyTeam] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(0);
  const [pointsBehindLeader, setPointsBehindLeader] = useState(0);
  const [weeklyChange, setWeeklyChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [teamError, setTeamError] = useState(null);

  // Helper function to extract initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/leaderboard');
      const leaderboardData = response.data;
      
      // Find current player's team from leaderboard data
      const currentPlayerData = leaderboardData.find(
        player => player.player_id === user?.id
      );
      
      // Calculate user position (1-indexed)
      const position = leaderboardData.findIndex(p => p.player_id === user?.id) + 1;
      setUserPosition(position);
      
      // Calculate points behind leader
      if (leaderboardData.length > 0 && currentPlayerData) {
        const leaderScore = leaderboardData[0].total_score;
        const userScore = currentPlayerData.total_score;
        setPointsBehindLeader(Math.max(0, leaderScore - userScore));
      } else {
        setPointsBehindLeader(0);
      }
      
      // Set weekly change from current player data
      if (currentPlayerData) {
        setWeeklyChange(currentPlayerData.weekly_change || 0);
      }
      
      // Transform team data with initials
      if (currentPlayerData) {
        const transformedTeam = {
          ...currentPlayerData,
          drafted_contestants: currentPlayerData.drafted_contestants.map(contestant => ({
            ...contestant,
            initials: getInitials(contestant.name)
          })),
          sole_survivor: currentPlayerData.sole_survivor ? {
            ...currentPlayerData.sole_survivor,
            initials: getInitials(currentPlayerData.sole_survivor.name)
          } : null
        };
        setMyTeam(transformedTeam);
        setTeamError(null);
      } else {
        setMyTeam(null);
      }
      
      // Transform leaderboard data with initials
      const transformedLeaderboard = leaderboardData.map(player => ({
        ...player,
        initials: getInitials(player.player_name)
      }));
      
      setLeaderboard(transformedLeaderboard);
      setLeaderboardError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      const errorMessage = err.response?.data?.error || 'Failed to load data. Please try again.';
      setLeaderboardError(errorMessage);
      setTeamError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        fetchLeaderboard();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchLeaderboard();
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <LoadingSpinner 
          size="lg" 
          text="Loading your dashboard..." 
          centered={true}
          role="status"
          aria-live="polite"
        />
      </div>
    );
  }

  // Determine if user has completed rankings
  const hasCompletedRankings = myTeam && (myTeam.drafted_contestants.length > 0 || myTeam.sole_survivor);

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <h1 className="page-title">Season 49 Dashboard</h1>
        <p className="body-text welcome-message" role="status" aria-live="polite">
          {hasCompletedRankings 
            ? `Welcome back, ${user?.username || user?.email}! Track your team's performance below.`
            : "Welcome to Survivor Season 49! Complete your draft and sole survivor pick to get started."
          }
        </p>
      </header>
      
      {/* Two-Column Layout */}
      <div className="dashboard-columns">
        {/* Left Column: Leaderboard */}
        <LeaderboardCard 
          players={leaderboard}
          userPosition={userPosition}
          pointsBehindLeader={pointsBehindLeader}
          currentUserId={user?.id}
          error={leaderboardError}
          onRetry={handleRefresh}
        />

        {/* Right Column: My Team */}
        <MyTeamCard
          soleSurvivor={myTeam?.sole_survivor || null}
          draftPicks={myTeam?.drafted_contestants || []}
          totalScore={myTeam?.total_score || 0}
          weeklyChange={weeklyChange}
          error={teamError}
          onRetry={handleRefresh}
          playerId={user?.id}
        />
      </div>
    </div>
  );
};

export default Home;
