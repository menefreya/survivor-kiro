import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/Admin.css';

const Admin = () => {
  // Contestant Management State
  const [contestants, setContestants] = useState([]);
  const [newContestant, setNewContestant] = useState({
    name: '',
    profession: '',
    image_url: ''
  });
  const [contestantError, setContestantError] = useState('');
  const [contestantSuccess, setContestantSuccess] = useState('');

  // Draft State
  const [draftStatus, setDraftStatus] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftSuccess, setDraftSuccess] = useState('');

  // Score Entry State
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [contestantScores, setContestantScores] = useState({});
  const [scoreError, setScoreError] = useState('');
  const [scoreSuccess, setScoreSuccess] = useState('');
  const [scoreLoading, setScoreLoading] = useState(false);

  // Fetch contestants on mount
  useEffect(() => {
    fetchContestants();
    fetchDraftStatus();
  }, []);

  const fetchContestants = async () => {
    try {
      const response = await api.get('/contestants');
      setContestants(response.data);
      // Initialize scores object
      const scores = {};
      response.data.forEach(c => {
        scores[c.id] = '';
      });
      setContestantScores(scores);
    } catch (error) {
      console.error('Error fetching contestants:', error);
    }
  };

  const fetchDraftStatus = async () => {
    try {
      const response = await api.get('/draft/status');
      setDraftStatus(response.data);
    } catch (error) {
      console.error('Error fetching draft status:', error);
    }
  };

  // Contestant Management Handlers
  const handleContestantInputChange = (e) => {
    setNewContestant({
      ...newContestant,
      [e.target.name]: e.target.value
    });
  };

  const handleAddContestant = async (e) => {
    e.preventDefault();
    setContestantError('');
    setContestantSuccess('');

    if (!newContestant.name.trim()) {
      setContestantError('Name is required');
      return;
    }

    try {
      await api.post('/contestants', newContestant);
      setContestantSuccess('Contestant added successfully!');
      setNewContestant({ name: '', profession: '', image_url: '' });
      fetchContestants();
    } catch (error) {
      setContestantError(error.response?.data?.error || 'Failed to add contestant');
    }
  };

  const handleToggleEliminated = async (contestantId, currentStatus) => {
    try {
      await api.put(`/contestants/${contestantId}`, {
        is_eliminated: !currentStatus
      });
      fetchContestants();
    } catch (error) {
      setContestantError(error.response?.data?.error || 'Failed to update contestant');
    }
  };

  // Draft Handlers
  const handleTriggerDraft = async () => {
    setDraftLoading(true);
    setDraftError('');
    setDraftSuccess('');

    try {
      const response = await api.post('/draft');
      setDraftSuccess(response.data.message || 'Draft completed successfully!');
      fetchDraftStatus();
    } catch (error) {
      setDraftError(error.response?.data?.error || 'Failed to trigger draft');
    } finally {
      setDraftLoading(false);
    }
  };

  // Score Entry Handlers
  const handleScoreChange = (contestantId, value) => {
    setContestantScores({
      ...contestantScores,
      [contestantId]: value
    });
  };

  const handleSubmitScores = async (e) => {
    e.preventDefault();
    setScoreError('');
    setScoreSuccess('');

    if (!episodeNumber || episodeNumber < 1) {
      setScoreError('Please enter a valid episode number');
      return;
    }

    // Validate all scores are filled
    const scores = [];
    for (const contestant of contestants) {
      const score = contestantScores[contestant.id];
      if (score === '' || score === null || score === undefined) {
        setScoreError('Please enter scores for all contestants');
        return;
      }
      scores.push({
        contestant_id: contestant.id,
        score: parseInt(score, 10)
      });
    }

    setScoreLoading(true);

    try {
      await api.post('/scores', {
        episode_number: parseInt(episodeNumber, 10),
        scores
      });
      setScoreSuccess(`Episode ${episodeNumber} scores added successfully!`);
      setEpisodeNumber('');
      // Reset scores
      const resetScores = {};
      contestants.forEach(c => {
        resetScores[c.id] = '';
      });
      setContestantScores(resetScores);
      fetchContestants(); // Refresh to show updated totals
    } catch (error) {
      setScoreError(error.response?.data?.error || 'Failed to add scores');
    } finally {
      setScoreLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h2>Admin Dashboard</h2>

      {/* Contestant Management Section */}
      <section className="admin-section" aria-labelledby="manage-contestants-heading">
        <h3 id="manage-contestants-heading">Manage Contestants</h3>
        
        <form onSubmit={handleAddContestant} className="contestant-form" aria-label="Add new contestant">
          <div className="form-group">
            <label htmlFor="name" className="required">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newContestant.name}
              onChange={handleContestantInputChange}
              required
              aria-required="true"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="profession">Profession</label>
            <input
              type="text"
              id="profession"
              name="profession"
              value={newContestant.profession}
              onChange={handleContestantInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="image_url">Image URL</label>
            <input
              type="url"
              id="image_url"
              name="image_url"
              value={newContestant.image_url}
              onChange={handleContestantInputChange}
              aria-describedby="image-url-hint"
            />
            <span id="image-url-hint" className="visually-hidden">Enter a valid URL for the contestant's image</span>
          </div>
          
          <button type="submit" className="btn-primary">Add Contestant</button>
        </form>

        {contestantError && <div className="error-message" role="alert">{contestantError}</div>}
        {contestantSuccess && <div className="success-message" role="status">{contestantSuccess}</div>}

        <div className="contestants-list">
          <h4>All Contestants</h4>
          {contestants.length === 0 ? (
            <p>No contestants added yet.</p>
          ) : (
            <table className="contestants-table" role="table" aria-label="Contestants list">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Profession</th>
                  <th scope="col">Total Score</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {contestants.map(contestant => (
                  <tr key={contestant.id} className={contestant.is_eliminated ? 'eliminated' : ''}>
                    <td>{contestant.name}</td>
                    <td>{contestant.profession || 'N/A'}</td>
                    <td>{contestant.total_score || 0}</td>
                    <td>
                      <span role="status">
                        {contestant.is_eliminated ? 'Eliminated' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleEliminated(contestant.id, contestant.is_eliminated)}
                        className="btn-secondary"
                        aria-label={`${contestant.is_eliminated ? 'Reactivate' : 'Eliminate'} ${contestant.name}`}
                      >
                        {contestant.is_eliminated ? 'Reactivate' : 'Eliminate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Draft Section */}
      <section className="admin-section" aria-labelledby="trigger-draft-heading">
        <h3 id="trigger-draft-heading">Trigger Draft</h3>
        
        {draftStatus && (
          <div className="draft-status" role="status" aria-live="polite">
            <p><strong>Status:</strong> {draftStatus.isComplete ? 'Complete' : 'Pending'}</p>
            {draftStatus.completedAt && (
              <p><strong>Completed:</strong> {new Date(draftStatus.completedAt).toLocaleString()}</p>
            )}
            {!draftStatus.isComplete && (
              <>
                <p><strong>Rankings Submitted:</strong> {draftStatus.submittedCount} / {draftStatus.totalPlayers}</p>
                
                {draftStatus.players && draftStatus.players.length > 0 && (
                  <div className="player-status-list">
                    <h4>Player Submission Status</h4>
                    <table className="player-status-table" role="table" aria-label="Player ranking submission status">
                      <thead>
                        <tr>
                          <th scope="col">Player</th>
                          <th scope="col">Email</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftStatus.players.map(player => (
                          <tr key={player.id} className={player.hasSubmitted ? 'submitted' : 'pending'}>
                            <td>{player.name}</td>
                            <td>{player.email}</td>
                            <td>
                              <span className={`status-badge ${player.hasSubmitted ? 'status-submitted' : 'status-pending'}`}>
                                {player.hasSubmitted ? '✓ Submitted' : '⏳ Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          onClick={handleTriggerDraft}
          disabled={draftLoading || draftStatus?.isComplete}
          className="btn-primary"
          aria-busy={draftLoading}
          aria-label="Trigger draft to assign contestants to players"
        >
          {draftLoading ? 'Processing...' : 'Trigger Draft'}
        </button>

        {draftError && <div className="error-message" role="alert">{draftError}</div>}
        {draftSuccess && <div className="success-message" role="status">{draftSuccess}</div>}
      </section>

      {/* Score Entry Section */}
      <section className="admin-section" aria-labelledby="enter-scores-heading">
        <h3 id="enter-scores-heading">Enter Episode Scores</h3>
        
        <form onSubmit={handleSubmitScores} className="score-form" aria-label="Enter episode scores">
          <div className="form-group">
            <label htmlFor="episodeNumber" className="required">Episode Number</label>
            <input
              type="number"
              id="episodeNumber"
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(e.target.value)}
              min="1"
              required
              aria-required="true"
            />
          </div>

          <div className="scores-grid">
            <h4>Contestant Scores</h4>
            {contestants.length === 0 ? (
              <p>No contestants available. Add contestants first.</p>
            ) : (
              contestants.map(contestant => (
                <div key={contestant.id} className="score-input-group">
                  <label htmlFor={`score-${contestant.id}`} className="required">
                    {contestant.name} (Total: {contestant.total_score || 0})
                  </label>
                  <input
                    type="number"
                    id={`score-${contestant.id}`}
                    value={contestantScores[contestant.id] || ''}
                    onChange={(e) => handleScoreChange(contestant.id, e.target.value)}
                    required
                    aria-required="true"
                    aria-label={`Score for ${contestant.name}`}
                  />
                </div>
              ))
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={scoreLoading || contestants.length === 0}
            aria-busy={scoreLoading}
          >
            {scoreLoading ? 'Submitting...' : 'Submit Episode Scores'}
          </button>
        </form>

        {scoreError && <div className="error-message" role="alert">{scoreError}</div>}
        {scoreSuccess && <div className="success-message" role="status">{scoreSuccess}</div>}
      </section>
    </div>
  );
};

export default Admin;
