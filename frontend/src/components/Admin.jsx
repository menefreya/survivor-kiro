import { useState, useEffect } from 'react';
import api from '../services/api';
import AdminEventEntry from './AdminEventEntry';
import ContestantEventHistory from './ContestantEventHistory';
import AdminPredictionManager from './AdminPredictionManager';
import AdminPredictionStatistics from './AdminPredictionStatistics';
import '../styles/07-pages/admin.css';
// Prediction styles are included in admin.css

const Admin = () => {
  // Tab State
  const [activeTab, setActiveTab] = useState('events');
  const [showStatistics, setShowStatistics] = useState(false);

  // Contestant Management State
  const [contestants, setContestants] = useState([]);
  const [contestantError, setContestantError] = useState('');
  const [editingTribe, setEditingTribe] = useState(null);
  const [tribeValue, setTribeValue] = useState('');
  const [bulkTribeMode, setBulkTribeMode] = useState(false);
  const [selectedContestants, setSelectedContestants] = useState([]);
  const [bulkTribeValue, setBulkTribeValue] = useState('');

  // Draft State
  const [draftStatus, setDraftStatus] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftSuccess, setDraftSuccess] = useState('');

  // Event History State
  const [selectedContestantId, setSelectedContestantId] = useState(null);
  const [showEventHistory, setShowEventHistory] = useState(false);

  // Fetch contestants on mount
  useEffect(() => {
    fetchContestants();
    fetchDraftStatus();
  }, []);

  const fetchContestants = async () => {
    try {
      const response = await api.get('/contestants');
      setContestants(response.data);
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

  const handleViewEventHistory = (contestantId) => {
    setSelectedContestantId(contestantId);
    setShowEventHistory(true);
  };

  const handleCloseEventHistory = () => {
    setShowEventHistory(false);
    setSelectedContestantId(null);
  };

  const handleEventDeleted = () => {
    // Refresh contestants to update scores
    fetchContestants();
  };

  // Tribe Management Handlers
  const handleEditTribe = (contestantId, currentTribe) => {
    setEditingTribe(contestantId);
    setTribeValue(currentTribe || '');
  };

  const handleCancelEditTribe = () => {
    setEditingTribe(null);
    setTribeValue('');
  };

  const handleSaveTribe = async (contestantId) => {
    try {
      await api.put(`/contestants/${contestantId}`, {
        current_tribe: tribeValue || null
      });
      fetchContestants();
      setEditingTribe(null);
      setTribeValue('');
    } catch (error) {
      setContestantError(error.response?.data?.error || 'Failed to update tribe');
    }
  };

  const handleToggleBulkMode = () => {
    setBulkTribeMode(!bulkTribeMode);
    setSelectedContestants([]);
    setBulkTribeValue('');
  };

  const handleToggleContestantSelection = (contestantId) => {
    setSelectedContestants(prev => {
      if (prev.includes(contestantId)) {
        return prev.filter(id => id !== contestantId);
      } else {
        return [...prev, contestantId];
      }
    });
  };

  const handleBulkTribeUpdate = async () => {
    if (selectedContestants.length === 0) {
      setContestantError('Please select at least one contestant');
      return;
    }

    try {
      // Update all selected contestants
      await Promise.all(
        selectedContestants.map(contestantId =>
          api.put(`/contestants/${contestantId}`, {
            current_tribe: bulkTribeValue || null
          })
        )
      );
      
      fetchContestants();
      setBulkTribeMode(false);
      setSelectedContestants([]);
      setBulkTribeValue('');
      setContestantError('');
    } catch (error) {
      setContestantError(error.response?.data?.error || 'Failed to update tribes');
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

  return (
    <div className="admin-container">
      <h2>Admin Dashboard</h2>

      {/* Tab Navigation */}
      <div className="admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'events'}
          aria-controls="events-panel"
          className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Event Entry
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'contestants'}
          aria-controls="contestants-panel"
          className={`admin-tab ${activeTab === 'contestants' ? 'active' : ''}`}
          onClick={() => setActiveTab('contestants')}
        >
          Manage Contestants
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'draft'}
          aria-controls="draft-panel"
          className={`admin-tab ${activeTab === 'draft' ? 'active' : ''}`}
          onClick={() => setActiveTab('draft')}
        >
          Draft
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'predictions'}
          aria-controls="predictions-panel"
          className={`admin-tab ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          Predictions
        </button>
      </div>

      {/* Tab Panels */}
      <div className="admin-tab-content">
        {/* Event Entry Tab */}
        {activeTab === 'events' && (
          <div role="tabpanel" id="events-panel" aria-labelledby="events-tab">
            <section className="admin-section">
              <AdminEventEntry />
            </section>
          </div>
        )}

        {/* Contestant Management Tab */}
        {activeTab === 'contestants' && (
          <div role="tabpanel" id="contestants-panel" aria-labelledby="contestants-tab">
            <section className="admin-section">
              <h3>Manage Contestants</h3>

              {contestantError && <div className="error-message" role="alert">{contestantError}</div>}

              {/* Bulk Tribe Update Controls */}
              <div className="tribe-management-controls">
                <button
                  onClick={handleToggleBulkMode}
                  className={bulkTribeMode ? 'btn-primary' : 'btn-secondary'}
                  aria-pressed={bulkTribeMode}
                >
                  {bulkTribeMode ? '✓ Bulk Mode Active' : 'Bulk Tribe Update'}
                </button>

                {bulkTribeMode && (
                  <div className="bulk-tribe-controls">
                    <input
                      type="text"
                      value={bulkTribeValue}
                      onChange={(e) => setBulkTribeValue(e.target.value)}
                      placeholder="Enter tribe name (e.g., Taku, Vati)"
                      className="tribe-input"
                      aria-label="Bulk tribe name"
                    />
                    <button
                      onClick={handleBulkTribeUpdate}
                      disabled={selectedContestants.length === 0}
                      className="btn-primary"
                    >
                      Update {selectedContestants.length} Selected
                    </button>
                    <button
                      onClick={handleToggleBulkMode}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="contestants-list">
                {contestants.length === 0 ? (
                  <p>No contestants added yet.</p>
                ) : (
                  <div className="contestants-table-container">
                    <table className="contestants-table" role="table" aria-label="Contestants list">
                    <thead>
                      <tr>
                        {bulkTribeMode && <th scope="col">Select</th>}
                        <th scope="col">Name</th>
                        <th scope="col">Profession</th>
                        <th scope="col">Tribe</th>
                        <th scope="col">Total Score</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contestants.map(contestant => (
                        <tr key={contestant.id} className={contestant.is_eliminated ? 'eliminated' : ''}>
                          {bulkTribeMode && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedContestants.includes(contestant.id)}
                                onChange={() => handleToggleContestantSelection(contestant.id)}
                                aria-label={`Select ${contestant.name}`}
                              />
                            </td>
                          )}
                          <td>{contestant.name}</td>
                          <td>{contestant.profession || 'N/A'}</td>
                          <td>
                            {editingTribe === contestant.id ? (
                              <div className="tribe-edit-inline">
                                <input
                                  type="text"
                                  value={tribeValue}
                                  onChange={(e) => setTribeValue(e.target.value)}
                                  placeholder="Tribe name"
                                  className="tribe-input-small"
                                  aria-label={`Edit tribe for ${contestant.name}`}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveTribe(contestant.id)}
                                  className="btn-sm btn-primary"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEditTribe}
                                  className="btn-sm btn-secondary"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="tribe-display">
                                <span className={contestant.current_tribe ? `tribe-badge tribe-${contestant.current_tribe.toLowerCase()}` : 'tribe-none'}>
                                  {contestant.current_tribe || 'No tribe'}
                                </span>
                                <button
                                  onClick={() => handleEditTribe(contestant.id, contestant.current_tribe)}
                                  className="btn-icon"
                                  aria-label={`Edit tribe for ${contestant.name}`}
                                  title="Edit tribe"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </td>
                          <td>{contestant.total_score || 0}</td>
                          <td>
                            <span role="status">
                              {contestant.is_eliminated ? 'Eliminated' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => handleViewEventHistory(contestant.id)}
                                className="btn-secondary btn-sm"
                                aria-label={`View event history for ${contestant.name}`}
                                title="View Event History"
                              >
                                📋 Events
                              </button>
                              <button
                                onClick={() => handleToggleEliminated(contestant.id, contestant.is_eliminated)}
                                className="btn-secondary btn-sm"
                                aria-label={`${contestant.is_eliminated ? 'Reactivate' : 'Eliminate'} ${contestant.name}`}
                              >
                                {contestant.is_eliminated ? 'Reactivate' : 'Eliminate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Draft Tab */}
        {activeTab === 'draft' && (
          <div role="tabpanel" id="draft-panel" aria-labelledby="draft-tab">
            <section className="admin-section">
              <h3>Trigger Draft</h3>
              
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
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div role="tabpanel" id="predictions-panel" aria-labelledby="predictions-tab">
            <section className="admin-section">
              <div className="predictions-sub-tabs">
                <button
                  className={`sub-tab ${activeTab === 'predictions' && !showStatistics ? 'active' : ''}`}
                  onClick={() => setShowStatistics(false)}
                >
                  Manage Predictions
                </button>
                <button
                  className={`sub-tab ${showStatistics ? 'active' : ''}`}
                  onClick={() => setShowStatistics(true)}
                >
                  Statistics
                </button>
              </div>

              {!showStatistics ? (
                <AdminPredictionManager />
              ) : (
                <AdminPredictionStatistics />
              )}
            </section>
          </div>
        )}
      </div>

      {/* Event History Modal */}
      {showEventHistory && selectedContestantId && (
        <ContestantEventHistory
          contestantId={selectedContestantId}
          onClose={handleCloseEventHistory}
          onEventDeleted={handleEventDeleted}
        />
      )}
    </div>
  );
};

export default Admin;
