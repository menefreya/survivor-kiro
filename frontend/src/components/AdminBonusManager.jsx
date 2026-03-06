import { useState, useEffect } from 'react';
import api from '../services/api';

const AdminBonusManager = () => {
  const [bonuses, setBonuses] = useState([]);
  const [players, setPlayers] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    player_id: '',
    amount: '',
    reason: '',
    episode_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bonusRes, playerRes, episodeRes] = await Promise.all([
        api.get('/bonuses'),
        api.get('/players'),
        api.get('/episodes')
      ]);
      setBonuses(bonusRes.data);
      setPlayers(playerRes.data.players || playerRes.data);
      setEpisodes(episodeRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.player_id || form.amount === '' || !form.reason.trim()) {
      setError('Player, amount, and reason are required');
      return;
    }

    const amount = parseInt(form.amount, 10);
    if (isNaN(amount)) {
      setError('Amount must be a number');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bonuses', {
        player_id: parseInt(form.player_id, 10),
        amount,
        reason: form.reason.trim(),
        episode_id: form.episode_id ? parseInt(form.episode_id, 10) : undefined
      });
      setSuccess('Bonus added successfully');
      setForm({ player_id: '', amount: '', reason: '', episode_id: '' });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add bonus');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bonus?')) return;
    setError('');
    try {
      await api.delete(`/bonuses/${id}`);
      setBonuses(prev => prev.filter(b => b.id !== id));
      setSuccess('Bonus deleted');
    } catch (err) {
      setError('Failed to delete bonus');
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <p>Loading...</p>;

  return (
    <div className="admin-bonus-manager">
      <h3 className="admin-section__title">Bonus Points</h3>

      {error && <div className="error-message" role="alert">{error}</div>}
      {success && <div className="success-message" role="status">{success}</div>}

      {/* Add bonus form */}
      <form onSubmit={handleSubmit} className="bonus-form">
        <h4>Add Bonus</h4>
        <div className="bonus-form__fields">
          <div className="bonus-form__field">
            <label htmlFor="bonus-player">Player</label>
            <select
              id="bonus-player"
              value={form.player_id}
              onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}
              required
            >
              <option value="">Select player...</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="bonus-form__field">
            <label htmlFor="bonus-amount">Amount (pts)</label>
            <input
              id="bonus-amount"
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 25 or -5"
              required
            />
          </div>

          <div className="bonus-form__field bonus-form__field--wide">
            <label htmlFor="bonus-reason">Reason</label>
            <input
              id="bonus-reason"
              type="text"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Correctly picked sole survivor"
              required
            />
          </div>

          <div className="bonus-form__field">
            <label htmlFor="bonus-episode">Episode (optional)</label>
            <select
              id="bonus-episode"
              value={form.episode_id}
              onChange={e => setForm(f => ({ ...f, episode_id: e.target.value }))}
            >
              <option value="">None</option>
              {episodes.map(ep => (
                <option key={ep.id} value={ep.id}>Episode {ep.episode_number}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Bonus'}
        </button>
      </form>

      {/* Existing bonuses */}
      <div className="bonus-list">
        <h4>All Bonuses</h4>
        {bonuses.length === 0 ? (
          <p>No bonuses awarded yet.</p>
        ) : (
          <table className="contestants-table" role="table" aria-label="Player bonuses">
            <thead>
              <tr>
                <th>Player</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Episode</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bonuses.map(bonus => (
                <tr key={bonus.id}>
                  <td>{bonus.player?.name}</td>
                  <td style={{ color: bonus.amount >= 0 ? 'var(--color-success, #22c55e)' : 'var(--color-error, #ef4444)', fontWeight: 600 }}>
                    {bonus.amount >= 0 ? `+${bonus.amount}` : bonus.amount}
                  </td>
                  <td>{bonus.reason}</td>
                  <td>{bonus.episode ? `Ep ${bonus.episode.episode_number}` : '—'}</td>
                  <td>{formatDate(bonus.created_at)}</td>
                  <td>
                    <button
                      className="btn btn--sm btn--secondary"
                      onClick={() => handleDelete(bonus.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminBonusManager;
