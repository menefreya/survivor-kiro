import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../styles/Ranking.css';

const Ranking = () => {
  const { user } = useContext(AuthContext);
  const [contestants, setContestants] = useState([]);
  const [rankedContestants, setRankedContestants] = useState([]);
  const [soleSurvivorId, setSoleSurvivorId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (user) {
      fetchContestants();
    }
  }, [user]);

  const fetchContestants = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Ensure user is loaded
      if (!user) {
        setError('Please log in to view rankings.');
        setIsLoading(false);
        return;
      }
      
      // Fetch all contestants
      const contestantsResponse = await api.get('/contestants');
      const contestantsList = contestantsResponse.data;
      
      // Check if user has already submitted rankings
      if (user?.has_submitted_rankings) {
        // Validate user ID exists
        if (!user.id) {
          console.error('User ID is missing');
          setError('User information is incomplete. Please log in again.');
          setRankedContestants(contestantsList);
          return;
        }
        
        // Fetch existing rankings
        try {
          const rankingsResponse = await api.get(`/rankings/${user.id}`);
          const rankingsData = rankingsResponse.data;
          
          // Extract rankings array and map to contestants
          const rankings = rankingsData.rankings || [];
          
          const sorted = rankings.sort((a, b) => a.rank - b.rank);
          const contestants = sorted.map(r => r.contestants);
          
          setRankedContestants(contestants);
          
          // Set sole survivor from the response
          if (rankingsData.sole_survivor) {
            setSoleSurvivorId(rankingsData.sole_survivor.id?.toString() || '');
          }
          
          setIsLocked(true);
        } catch (rankingError) {
          console.error('Error fetching rankings:', rankingError);
          console.error('User ID:', user.id);
          console.error('Response:', rankingError.response?.data);
          setError(`Failed to load your rankings: ${rankingError.response?.data?.error || rankingError.message}`);
          setRankedContestants(contestantsList);
        }
      } else {
        // Initialize with unranked contestants
        setRankedContestants(contestantsList);
      }
      
      setContestants(contestantsList);
    } catch (err) {
      console.error('Error fetching contestants:', err);
      setError('Failed to load contestants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e, index) => {
    if (isLocked) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    if (isLocked) return;
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newRanked = [...rankedContestants];
    const draggedItem = newRanked[draggedIndex];
    
    // Remove from old position
    newRanked.splice(draggedIndex, 1);
    // Insert at new position
    newRanked.splice(dropIndex, 0, draggedItem);
    
    setRankedContestants(newRanked);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleRankChange = (currentIndex, newRank) => {
    if (isLocked) return;
    
    // Validate input
    const rank = parseInt(newRank);
    if (isNaN(rank) || rank < 1 || rank > rankedContestants.length) {
      return;
    }

    // Convert to 0-based index
    const newIndex = rank - 1;
    
    if (currentIndex === newIndex) {
      return;
    }

    const newRanked = [...rankedContestants];
    const movedItem = newRanked[currentIndex];
    
    // Remove from old position
    newRanked.splice(currentIndex, 1);
    // Insert at new position
    newRanked.splice(newIndex, 0, movedItem);
    
    setRankedContestants(newRanked);
  };

  const handleSoleSurvivorChange = (e) => {
    if (isLocked) return;
    setSoleSurvivorId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!soleSurvivorId || soleSurvivorId === '') {
      setError('Please select a sole survivor pick.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare rankings data
      const rankings = rankedContestants.map((contestant, index) => ({
        contestant_id: contestant.id,
        rank: index + 1
      }));

      // Parse sole survivor ID to integer
      const survivorId = parseInt(soleSurvivorId, 10);

      // Submit rankings and sole survivor in a single request
      await api.post('/rankings', {
        rankings: rankings,
        sole_survivor_id: survivorId
      });

      setSuccess(true);
      setIsLocked(true);
      
      // Refresh user data to update has_submitted_rankings flag
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error submitting rankings:', err);
      setError(err.response?.data?.error || 'Failed to submit rankings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="ranking-container"><div className="loading">Loading contestants...</div></div>;
  }

  return (
    <div className="ranking-container">
      <h2>Rank Contestants</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Rankings submitted successfully!</div>}
      
      {isLocked && (
        <div className="locked-message">
          Your rankings have been submitted and are now locked. The draft will begin once all players have submitted their rankings.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isLocked ? (
          <div className="sole-survivor-display">
            <h3>Your Sole Survivor Pick</h3>
            <div className="survivor-card">
              {soleSurvivorId && contestants.find(c => c.id === parseInt(soleSurvivorId)) ? (
                <>
                  <img 
                    src={contestants.find(c => c.id === parseInt(soleSurvivorId))?.image_url || 'https://via.placeholder.com/80?text=No+Image'} 
                    alt={contestants.find(c => c.id === parseInt(soleSurvivorId))?.name}
                    className="survivor-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/80?text=No+Image';
                    }}
                  />
                  <div className="survivor-info">
                    <h4>{contestants.find(c => c.id === parseInt(soleSurvivorId))?.name}</h4>
                    <p>{contestants.find(c => c.id === parseInt(soleSurvivorId))?.profession}</p>
                  </div>
                </>
              ) : (
                <p>No sole survivor selected</p>
              )}
            </div>
          </div>
        ) : (
          <div className="sole-survivor-section">
            <label htmlFor="sole-survivor">
              <strong>Sole Survivor Pick:</strong> Who do you think will win?
            </label>
            <select
              id="sole-survivor"
              value={soleSurvivorId}
              onChange={handleSoleSurvivorChange}
              disabled={isLocked}
              required
            >
              <option value="">-- Select Sole Survivor --</option>
              {contestants.map((contestant) => (
                <option key={contestant.id} value={contestant.id}>
                  {contestant.name}
                </option>
              ))}
            </select>
            {soleSurvivorId && (
              <div className="selected-survivor">
                Selected: {contestants.find(c => c.id === parseInt(soleSurvivorId))?.name || 'Unknown'}
              </div>
            )}
          </div>
        )}

        <div className="ranking-instructions">
          {isLocked ? (
            <h3>Your Rankings</h3>
          ) : (
            <p>Drag and drop contestants or type a rank number to reorder them (1st = highest preference).</p>
          )}
        </div>

        <div className="ranked-list">
          {rankedContestants.map((contestant, index) => (
            <div
              key={contestant.id}
              className={`contestant-card ${draggedIndex === index ? 'dragging' : ''} ${isLocked ? 'locked' : ''}`}
              draggable={!isLocked}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {isLocked ? (
                <div className="rank-number">{index + 1}</div>
              ) : (
                <input
                  type="number"
                  className="rank-input"
                  value={index + 1}
                  min="1"
                  max={rankedContestants.length}
                  onChange={(e) => handleRankChange(index, e.target.value)}
                  onClick={(e) => e.target.select()}
                />
              )}
              <div className="contestant-info">
                <img 
                  src={contestant.image_url || 'https://via.placeholder.com/60?text=No+Image'} 
                  alt={contestant.name}
                  className="contestant-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/60?text=No+Image';
                  }}
                />
                <div className="contestant-details">
                  <div className="contestant-info-line">
                    <h3>{contestant.name}</h3>
                    <span className="contestant-separator">•</span>
                    <p>{contestant.profession || 'Contestant'}</p>
                    {contestant.is_eliminated && (
                      <>
                        <span className="contestant-separator">•</span>
                        <span className="eliminated-badge">Eliminated</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!isLocked && <div className="drag-handle">⋮⋮</div>}
            </div>
          ))}
        </div>

        {!isLocked && (
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rankings'}
          </button>
        )}
      </form>
    </div>
  );
};

export default Ranking;
