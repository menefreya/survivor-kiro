import { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const TeamDetails = () => {
  const { episodeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const [teamDetails, setTeamDetails] = useState(null);
  const [auditData, setAuditData] = useState([]);
  const [overallTotals, setOverallTotals] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(searchParams.get('playerId') || '');
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch players for all users
    if (user) {
      fetchPlayers();
    }
    fetchData();
  }, [episodeId, selectedPlayerId, user]);

  const fetchPlayers = async () => {
    if (!user) {
      return;
    }

    try {
      const response = await api.get('/team-details/players');
      setAllPlayers(response.data.players || []);

      // Set selected player name if playerId is in URL
      if (selectedPlayerId) {
        const player = response.data.players.find(p => p.id.toString() === selectedPlayerId);
        setSelectedPlayerName(player ? player.name : '');
      }
    } catch (err) {
      console.error('Error fetching players:', err);
      setAllPlayers([]);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = selectedPlayerId ? `?playerId=${selectedPlayerId}` : '';

      if (episodeId) {
        // Fetch specific episode details (legacy support)
        const response = await api.get(`/team-details/${episodeId}${queryParams}`);
        setTeamDetails(response.data);
      } else {
        // Fetch audit data for all episodes
        const response = await api.get(`/team-details/audit${queryParams}`);
        setAuditData(response.data.audit_data || []);
        setOverallTotals(response.data.overall_totals || null);
      }
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError(err.response?.data?.error || 'Failed to load team details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerChange = (playerId) => {
    setSelectedPlayerId(playerId);
    const player = allPlayers.find(p => p.id.toString() === playerId);
    setSelectedPlayerName(player ? player.name : '');
    
    // Update URL params
    if (playerId) {
      setSearchParams({ playerId });
    } else {
      setSearchParams({});
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    
    // Parse date as local date to avoid timezone issues
    // Split the date string and create date with local timezone
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEventTypeIcon = (eventType) => {
    const icons = {
      'immunity_win': '🛡️',
      'reward_win': '🏆',
      'individual_immunity': '🛡️',
      'tribal_immunity': '🛡️',
      'elimination': '❌',
      'quit': '🚪',
      'medical_evacuation': '🏥',
      'advantage_found': '🎯',
      'advantage_played': '⚡',
      'vote_against': '👎',
      'jury_vote': '⚖️',
      'fire_challenge_win': '🔥',
      'fire_challenge_loss': '💧'
    };
    return icons[eventType] || '📝';
  };

  const getEventTypeLabel = (eventType) => {
    const labels = {
      'immunity_win': 'Immunity Win',
      'reward_win': 'Reward Win',
      'individual_immunity': 'Individual Immunity',
      'tribal_immunity': 'Tribal Immunity',
      'elimination': 'Elimination',
      'quit': 'Quit',
      'medical_evacuation': 'Medical Evacuation',
      'advantage_found': 'Advantage Found',
      'advantage_played': 'Advantage Played',
      'vote_against': 'Vote Against',
      'jury_vote': 'Jury Vote',
      'fire_challenge_win': 'Fire Challenge Win',
      'fire_challenge_loss': 'Fire Challenge Loss'
    };
    return labels[eventType] || eventType.replace('_', ' ');
  };

  if (isLoading) {
    return (
      <div className="team-details-container">
        <LoadingSpinner size="lg" text="Loading team details..." centered={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-details-container">
        <div className="error-message">
          <h2>Error Loading Team Details</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn btn--primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Audit View - Show all episodes with detailed breakdowns
  if (!episodeId) {
    return (
      <div className="team-details-container">
        <div className="team-details-header">
          <h1>{selectedPlayerName ? `${selectedPlayerName}'s Score Breakdown` : 'Score Breakdown'}</h1>
          <p>Complete scoring breakdown for {selectedPlayerName ? `${selectedPlayerName}'s` : 'your'} team across all episodes</p>
          
          <div className="admin-player-selector">
            <label htmlFor="player-select">View team for:</label>
            <select
              id="player-select"
              value={selectedPlayerId}
              onChange={(e) => handlePlayerChange(e.target.value)}
              className="player-select"
            >
              <option value="">My Team</option>
              {allPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.email.split('@')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Overall Totals Summary */}
        {auditData.length > 0 && (
          <div className="overall-totals-card">
            <h2>Overall Totals</h2>
            <div className="overall-totals-grid">
              <div className="overall-total-item">
                <span className="overall-total-label">Episode Scores Total</span>
                <span className="overall-total-value">
                  {auditData.reduce((sum, ep) => sum + ep.scores.total_episode_score, 0)} pts
                </span>
              </div>
              {overallTotals && (
                <>
                  <div className="overall-total-item">
                    <span className="overall-total-label">Draft Score</span>
                    <span className="overall-total-value">{overallTotals.draft_score} pts</span>
                  </div>
                  <div className="overall-total-item">
                    <span className="overall-total-label">Sole Survivor</span>
                    <span className="overall-total-value">{overallTotals.sole_survivor_score} pts</span>
                  </div>
                  <div className="overall-total-item">
                    <span className="overall-total-label">SS Bonus</span>
                    <span className="overall-total-value">{overallTotals.sole_survivor_bonus} pts</span>
                  </div>
                  <div className="overall-total-item">
                    <span className="overall-total-label">Predictions</span>
                    <span className="overall-total-value">{overallTotals.prediction_bonus} pts</span>
                  </div>
                </>
              )}
            </div>
            <p className="overall-totals-note">
              If these numbers don't match, something is wrong. Tell Aloka.
            </p>
          </div>
        )}

        <div className="audit-episodes">
          {auditData.map(episodeData => {
            const { episode, team, scores, prediction_bonuses } = episodeData;
            
            return (
              <div key={episode.id} className="audit-episode-card">
                <div className="audit-episode-header">
                  <h2>Episode {episode.episode_number}</h2>
                  <span className="audit-episode-date">{formatDate(episode.aired_date)}</span>
                  <div className={`audit-episode-total ${scores.total_episode_score >= 0 ? 'positive' : 'negative'}`}>
                    {scores.total_episode_score > 0 ? '+' : ''}{scores.total_episode_score} pts
                  </div>
                </div>

                <div className="audit-episode-summary">
                  <div className="audit-summary-stat">
                    <span className="audit-summary-label">Draft</span>
                    <span className={`audit-summary-value ${scores.draft_score >= 0 ? 'positive' : 'negative'}`}>
                      {scores.draft_score > 0 ? '+' : ''}{scores.draft_score}
                    </span>
                  </div>
                  <div className="audit-summary-stat">
                    <span className="audit-summary-label">Sole Survivor</span>
                    <span className={`audit-summary-value ${scores.sole_survivor_score >= 0 ? 'positive' : 'negative'}`}>
                      {scores.sole_survivor_score > 0 ? '+' : ''}{scores.sole_survivor_score}
                    </span>
                  </div>
                  <div className="audit-summary-stat">
                    <span className="audit-summary-label">Predictions</span>
                    <span className={`audit-summary-value ${scores.prediction_bonus >= 0 ? 'positive' : 'negative'}`}>
                      {scores.prediction_bonus > 0 ? '+' : ''}{scores.prediction_bonus}
                    </span>
                  </div>
                </div>

                <div className="audit-detailed-breakdown">
                  {/* Draft Picks */}
                  {team.drafted_contestants && team.drafted_contestants.length > 0 && (
                    <div className="audit-breakdown-section">
                      <h4>Draft Picks</h4>
                      {team.drafted_contestants.map(contestant => (
                        <div key={`audit-draft-${contestant.id}`} className="audit-contestant">
                          <div className="audit-contestant-header">
                            <div className="audit-contestant-info">
                              <span className="audit-contestant-name">{contestant.name}</span>
                              {contestant.status === 'eliminated' && (
                                <span className="audit-contestant-status audit-contestant-status--eliminated">Eliminated</span>
                              )}
                              {contestant.status === 'inactive' && (
                                <span className="audit-contestant-status audit-contestant-status--inactive">New Pick</span>
                              )}
                            </div>
                            <span className={`audit-contestant-score ${contestant.episode_score >= 0 ? 'positive' : 'negative'} ${contestant.status !== 'active' ? 'non-active' : ''}`}>
                              {contestant.episode_score > 0 ? '+' : ''}{contestant.episode_score}
                              {contestant.status === 'eliminated' && <span className="score-note"> (penalty counts)</span>}
                              {contestant.status === 'inactive' && <span className="score-note"> (starts next episode)</span>}
                            </span>
                          </div>
                          {contestant.events && contestant.events.length > 0 ? (
                            <div className="audit-events">
                              {contestant.events.map((event, index) => (
                                <div key={index} className="audit-event">
                                  <span className="audit-event-icon">{getEventTypeIcon(event.event_type)}</span>
                                  <span className="audit-event-description">{event.description}</span>
                                  <span className={`audit-event-points ${event.points >= 0 ? 'positive' : 'negative'}`}>
                                    {event.points > 0 ? '+' : ''}{event.points}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="audit-no-events">No events</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sole Survivor */}
                  {team.sole_survivor && (
                    <div className="audit-breakdown-section">
                      <h4>Sole Survivor</h4>
                      <div className="audit-contestant">
                        <div className="audit-contestant-header">
                          <span className="audit-contestant-name">{team.sole_survivor.name}</span>
                          <span className={`audit-contestant-score ${team.sole_survivor.episode_score >= 0 ? 'positive' : 'negative'}`}>
                            {team.sole_survivor.episode_score > 0 ? '+' : ''}{team.sole_survivor.episode_score}
                          </span>
                        </div>
                        {team.sole_survivor.events && team.sole_survivor.events.length > 0 ? (
                          <div className="audit-events">
                            {team.sole_survivor.events.map((event, index) => (
                              <div key={index} className="audit-event">
                                <span className="audit-event-icon">{getEventTypeIcon(event.event_type)}</span>
                                <span className="audit-event-description">{event.description}</span>
                                <span className={`audit-event-points ${event.points >= 0 ? 'positive' : 'negative'}`}>
                                  {event.points > 0 ? '+' : ''}{event.points}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="audit-no-events">No events</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Predictions */}
                  {prediction_bonuses && prediction_bonuses.length > 0 && (
                    <div className="audit-breakdown-section">
                      <h4>Predictions</h4>
                      {prediction_bonuses.map((prediction, index) => (
                        <div key={index} className="audit-prediction">
                          <span className="audit-prediction-icon">🎯</span>
                          <span className="audit-prediction-text">{prediction.prediction_text}</span>
                          <span className="audit-prediction-points">+{prediction.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Specific Episode View
  const { episode, team, scores, prediction_bonuses } = teamDetails;
  
  // Debug: Log the team data to see what we're working with
  console.log('Team Details Data:', { episode, team, scores, prediction_bonuses });
  
  const allTeamMembers = [
    ...team.drafted_contestants.map(c => ({ ...c, pick_type: 'draft' })),
    ...(team.sole_survivor ? [{ ...team.sole_survivor, pick_type: 'sole_survivor' }] : [])
  ];

  return (
    <div className="team-details-container">
      <div className="team-details-header">
        <Link to={`/team-details${selectedPlayerId ? `?playerId=${selectedPlayerId}` : ''}`} className="back-link">
          ← Back to All Episodes
        </Link>
        <h1>Episode {episode.episode_number} {selectedPlayerName ? `- ${selectedPlayerName}'s Team` : 'Team Details'}</h1>
        <p className="episode-date">{formatDate(episode.aired_date)}</p>
        
        <div className="admin-player-selector">
          <label htmlFor="player-select-detail">View team for:</label>
          <select
            id="player-select-detail"
            value={selectedPlayerId}
            onChange={(e) => handlePlayerChange(e.target.value)}
            className="player-select"
          >
            <option value="">My Team</option>
            {allPlayers.map(player => (
              <option key={player.id} value={player.id}>
                {player.name} ({player.email.split('@')[0]})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="episode-summary-card">
        <h2>Episode Summary</h2>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat__label">Draft Score</span>
            <span className={`summary-stat__value ${scores.draft_score >= 0 ? 'positive' : 'negative'}`}>
              {scores.draft_score > 0 ? '+' : ''}{scores.draft_score}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat__label">Sole Survivor</span>
            <span className={`summary-stat__value ${scores.sole_survivor_score >= 0 ? 'positive' : 'negative'}`}>
              {scores.sole_survivor_score > 0 ? '+' : ''}{scores.sole_survivor_score}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat__label">Predictions</span>
            <span className={`summary-stat__value ${scores.prediction_bonus >= 0 ? 'positive' : 'negative'}`}>
              {scores.prediction_bonus > 0 ? '+' : ''}{scores.prediction_bonus}
            </span>
          </div>
          <div className="summary-stat summary-stat--total">
            <span className="summary-stat__label">Total</span>
            <span className={`summary-stat__value ${scores.total_episode_score >= 0 ? 'positive' : 'negative'}`}>
              {scores.total_episode_score > 0 ? '+' : ''}{scores.total_episode_score}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Score Breakdown */}
      <div className="detailed-breakdown-section" style={{ border: '2px solid red', padding: '20px', margin: '20px 0' }}>
        <h2>Detailed Score Breakdown</h2>
        <p style={{ color: 'blue' }}>Debug: This section should be visible</p>
        
        {/* Draft Picks Breakdown */}
        {team.drafted_contestants && team.drafted_contestants.length > 0 && (
          <div className="breakdown-category">
            <h3>Draft Picks ({scores.draft_score > 0 ? '+' : ''}{scores.draft_score} points)</h3>
            <div className="breakdown-contestants">
              {team.drafted_contestants.map(contestant => (
                <div key={`breakdown-draft-${contestant.id}`} className="breakdown-contestant">
                  <div className="breakdown-contestant__header">
                    <div className="breakdown-contestant__info">
                      {contestant.image_url ? (
                        <img 
                          src={contestant.image_url} 
                          alt={contestant.name}
                          className="breakdown-avatar"
                        />
                      ) : (
                        <div className="breakdown-avatar breakdown-avatar--placeholder">
                          {contestant.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="breakdown-contestant__name">{contestant.name}</span>
                    </div>
                    <span className={`breakdown-contestant__score ${contestant.episode_score >= 0 ? 'positive' : 'negative'}`}>
                      {contestant.episode_score > 0 ? '+' : ''}{contestant.episode_score}
                    </span>
                  </div>
                  
                  {contestant.events && contestant.events.length > 0 ? (
                    <div className="breakdown-events">
                      {contestant.events.map((event, index) => (
                        <div key={index} className="breakdown-event">
                          <span className="breakdown-event__icon">{getEventTypeIcon(event.event_type)}</span>
                          <span className="breakdown-event__description">{event.description}</span>
                          <span className={`breakdown-event__points ${event.points >= 0 ? 'positive' : 'negative'}`}>
                            {event.points > 0 ? '+' : ''}{event.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="breakdown-no-events">No events this episode</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sole Survivor Breakdown */}
        {team.sole_survivor && (
          <div className="breakdown-category">
            <h3>Sole Survivor ({scores.sole_survivor_score > 0 ? '+' : ''}{scores.sole_survivor_score} points)</h3>
            <div className="breakdown-contestants">
              <div className="breakdown-contestant">
                <div className="breakdown-contestant__header">
                  <div className="breakdown-contestant__info">
                    {team.sole_survivor.image_url ? (
                      <img 
                        src={team.sole_survivor.image_url} 
                        alt={team.sole_survivor.name}
                        className="breakdown-avatar"
                      />
                    ) : (
                      <div className="breakdown-avatar breakdown-avatar--placeholder">
                        {team.sole_survivor.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="breakdown-contestant__name">{team.sole_survivor.name}</span>
                    <span className="breakdown-contestant__badge">
                      Sole Survivor Pick
                      {team.sole_survivor.active_period && (
                        <span className="breakdown-contestant__period">
                          (Episodes {team.sole_survivor.active_period.start_episode}-{team.sole_survivor.active_period.end_episode || 'current'})
                        </span>
                      )}
                    </span>
                  </div>
                  <span className={`breakdown-contestant__score ${team.sole_survivor.episode_score >= 0 ? 'positive' : 'negative'}`}>
                    {team.sole_survivor.episode_score > 0 ? '+' : ''}{team.sole_survivor.episode_score}
                  </span>
                </div>
                
                {team.sole_survivor.events && team.sole_survivor.events.length > 0 ? (
                  <div className="breakdown-events">
                    {team.sole_survivor.events.map((event, index) => (
                      <div key={index} className="breakdown-event">
                        <span className="breakdown-event__icon">{getEventTypeIcon(event.event_type)}</span>
                        <span className="breakdown-event__description">{event.description}</span>
                        <span className={`breakdown-event__points ${event.points >= 0 ? 'positive' : 'negative'}`}>
                          {event.points > 0 ? '+' : ''}{event.points}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="breakdown-no-events">No events this episode</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prediction Bonuses Breakdown */}
        {prediction_bonuses && prediction_bonuses.length > 0 && (
          <div className="breakdown-category">
            <h3>Prediction Bonuses (+{scores.prediction_bonus} points)</h3>
            <div className="breakdown-predictions">
              {prediction_bonuses.map((prediction, index) => (
                <div key={index} className="breakdown-prediction">
                  <span className="breakdown-prediction__icon">🎯</span>
                  <span className="breakdown-prediction__text">{prediction.prediction_text}</span>
                  <span className="breakdown-prediction__points">+{prediction.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="team-members-section">
        <h2>Team Members</h2>
        <div className="team-members-grid">
          {allTeamMembers.map(contestant => (
            <div key={`${contestant.id}-${contestant.pick_type}`} className="team-member-card">
              <div className="team-member-card__header">
                <div className="contestant-info">
                  {contestant.image_url ? (
                    <img 
                      src={contestant.image_url} 
                      alt={contestant.name}
                      className="contestant-avatar"
                    />
                  ) : (
                    <div className="contestant-avatar contestant-avatar--placeholder">
                      {contestant.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="contestant-details">
                    <h3>{contestant.name}</h3>
                    <p className="contestant-profession">{contestant.profession}</p>
                    <span className={`pick-type-badge pick-type-badge--${contestant.pick_type}`}>
                      {contestant.pick_type === 'draft' ? 'Draft Pick' : 'Sole Survivor'}
                    </span>
                  </div>
                </div>
                <div className={`episode-score ${contestant.episode_score >= 0 ? 'positive' : 'negative'}`}>
                  {contestant.episode_score > 0 ? '+' : ''}{contestant.episode_score}
                </div>
              </div>

              {contestant.events && contestant.events.length > 0 && (
                <div className="events-section">
                  <h4>Episode Events</h4>
                  <div className="events-list">
                    {contestant.events.map((event, index) => (
                      <div key={index} className="event-item">
                        <span className="event-icon">{getEventTypeIcon(event.event_type)}</span>
                        <div className="event-details">
                          <span className="event-type">{getEventTypeLabel(event.event_type)}</span>
                          {event.description && (
                            <span className="event-description">{event.description}</span>
                          )}
                        </div>
                        <span className={`event-points ${event.points >= 0 ? 'positive' : 'negative'}`}>
                          {event.points > 0 ? '+' : ''}{event.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contestant.events && contestant.events.length === 0 && (
                <div className="no-events">
                  <p>No events this episode</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {prediction_bonuses && prediction_bonuses.length > 0 && (
        <div className="predictions-section">
          <h2>Prediction Bonuses</h2>
          <div className="predictions-list">
            {prediction_bonuses.map((prediction, index) => (
              <div key={index} className="prediction-item">
                <div className="prediction-text">{prediction.prediction_text}</div>
                <div className="prediction-points">+{prediction.points}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetails;