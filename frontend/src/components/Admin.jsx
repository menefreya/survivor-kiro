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
      <section className="admin-section">
        <h3>Manage Contestants</h3>
        
        <form onSubmit={handleAddContestant} className="contestant-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newContestant.name}
              onChange={handleContestantInputChange}
              required
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
              type="text"
              id="image_url"
              name="image_url"
              value={newContestant.image_url}
              onChange={handleContestantInputChange}
            />
          </div>
          
          <button type="submit" className="btn-primary">Add Contestant</button>
        </form>

        {contestantError && <div className="error-message">{contestantError}</div>}
        {contestantSuccess && <div className="success-message">{contestantSuccess}</div>}

        <div className="contestants-list">
          <h4>All Contestants</h4>
          {contestants.length === 0 ? (
            <p>No contestants added yet.</p>
          ) : (
            <table className="contestants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Profession</th>
                  <th>Total Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {contestants.map(contestant => (
                  <tr key={contestant.id} className={contestant.is_eliminated ? 'eliminated' : ''}>
                    <td>{contestant.name}</td>
                    <td>{contestant.profession || 'N/A'}</td>
                    <td>{contestant.total_score || 0}</td>
                    <td>{contestant.is_eliminated ? 'Eliminated' : 'Active'}</td>
                    <td>
                      <button
                        onClick={() => handleToggleEliminated(contestant.id, contestant.is_eliminated)}
                        className="btn-secondary"
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
      <section className="admin-section">
        <h3>Trigger Draft</h3>
        
        {draftStatus && (
          <div className="draft-status">
            <p><strong>Status:</strong> {draftStatus.draft_completed ? 'Complete' : 'Pending'}</p>
            {!draftStatus.draft_completed && (
              <p><strong>Players who submitted rankings:</strong> {draftStatus.players_submitted} / {draftStatus.total_players}</p>
            )}
          </div>
        )}

        <button
          onClick={handleTriggerDraft}
          disabled={draftLoading || draftStatus?.draft_completed}
          className="btn-primary"
        >
          {draftLoading ? 'Processing...' : 'Trigger Draft'}
        </button>

        {draftError && <div className="error-message">{draftError}</div>}
        {draftSuccess && <div className="success-message">{draftSuccess}</div>}
      </section>

      {/* Score Entry Section */}
      <section className="admin-section">
        <h3>Enter Episode Scores</h3>
        
        <form onSubmit={handleSubmitScores} className="score-form">
          <div className="form-group">
            <label htmlFor="episodeNumber">Episode Number *</label>
            <input
              type="number"
              id="episodeNumber"
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="scores-grid">
            <h4>Contestant Scores</h4>
            {contestants.length === 0 ? (
              <p>No contestants available. Add contestants first.</p>
            ) : (
              contestants.map(contestant => (
                <div key={contestant.id} className="score-input-group">
                  <label htmlFor={`score-${contestant.id}`}>
                    {contestant.name} (Total: {contestant.total_score || 0})
                  </label>
                  <input
                    type="number"
                    id={`score-${contestant.id}`}
                    value={contestantScores[contestant.id] || ''}
                    onChange={(e) => handleScoreChange(contestant.id, e.target.value)}
                    required
                  />
                </div>
              ))
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={scoreLoading || contestants.length === 0}
          >
            {scoreLoading ? 'Submitting...' : 'Submit Episode Scores'}
          </button>
        </form>

        {scoreError && <div className="error-message">{scoreError}</div>}
        {scoreSuccess && <div className="success-message">{scoreSuccess}</div>}
      </section>
    </div>
  );
};

export default Admin;
