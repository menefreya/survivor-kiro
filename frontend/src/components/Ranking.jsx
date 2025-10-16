import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { RankBadge, StatusBadge } from './badges';

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
    return (
      <div className="content-container u-flex u-justify-center u-items-center" style={{minHeight: '400px'}}>
        <LoadingSpinner 
          size="lg" 
          text="Loading contestants..." 
          centered 
          role="status"
          aria-live="polite"
        />
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="layout-header">
        <h1 className="layout-header__title">Rank Contestants</h1>
      </div>
      
      {error && <div className="form-message form-error" role="alert">{error}</div>}
      {success && <div className="form-message form-success" role="status">Rankings submitted successfully!</div>}
      
      {isLocked && (
        <div className="card card-warning u-mb-6" role="status" aria-live="polite">
          <div className="card-body u-text-center">
            <p className="card-text">
              Your rankings have been submitted and are now locked. The draft will begin once all players have submitted their rankings.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isLocked ? (
          <div className="card u-mb-8">
            <div className="card-header">
              <h2 className="card-header-title">Your Sole Survivor Pick</h2>
            </div>
            <div className="card-body">
              {soleSurvivorId && contestants.find(c => c.id === parseInt(soleSurvivorId)) ? (
                <div className="entity-row">
                  <div className="avatar avatar--xl">
                    <img 
                      src={contestants.find(c => c.id === parseInt(soleSurvivorId))?.image_url || 'https://via.placeholder.com/80?text=No+Image'} 
                      alt={contestants.find(c => c.id === parseInt(soleSurvivorId))?.name}
                      className="avatar__image"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/80?text=No+Image';
                      }}
                    />
                  </div>
                  <div className="entity-row__info">
                    <h3 className="entity-row__name">{contestants.find(c => c.id === parseInt(soleSurvivorId))?.name}</h3>
                    <p className="entity-row__subtitle">{contestants.find(c => c.id === parseInt(soleSurvivorId))?.profession}</p>
                  </div>
                </div>
              ) : (
                <p className="card-text">No sole survivor selected</p>
              )}
            </div>
          </div>
        ) : (
          <div className="card u-mb-6">
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="sole-survivor" className="form-label">
                  <strong>Sole Survivor Pick:</strong> Who do you think will win?
                </label>
                <select
                  id="sole-survivor"
                  className="form-select"
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
                  <div className="form-message form-success u-mt-2">
                    Selected: {contestants.find(c => c.id === parseInt(soleSurvivorId))?.name || 'Unknown'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-header-title">
              {isLocked ? 'Your Rankings' : 'Rank Contestants'}
            </h2>
            {!isLocked && (
              <p className="card-text u-text-sm u-text-secondary u-mt-2">
                Drag and drop contestants or type a rank number to reorder them (1st = highest preference).
              </p>
            )}
          </div>
          <div className="card-body">
            <div className="layout-stack" role="list" aria-label="Contestant rankings">
              {rankedContestants.map((contestant, index) => (
                <div
                  key={contestant.id}
                  className={`card card-interactive u-p-4 u-transition-all ${draggedIndex === index ? 'u-opacity-50 u-scale-98' : ''} ${isLocked ? 'u-cursor-default u-bg-secondary' : 'u-cursor-move'}`}
                  draggable={!isLocked}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  role="listitem"
                  aria-label={`${contestant.name}, rank ${index + 1} of ${rankedContestants.length}${contestant.is_eliminated ? ', eliminated' : ''}`}
                  tabIndex={isLocked ? -1 : 0}
                >
                  <div className="u-flex u-items-center u-w-full">
                    {isLocked ? (
                      <div className="u-mr-4">
                        <RankBadge rank={index + 1} size="lg" />
                      </div>
                    ) : (
                      <input
                        type="number"
                        className="form-input u-w-16 u-text-center u-text-lg u-font-bold u-text-success u-mr-4"
                        value={index + 1}
                        min="1"
                        max={rankedContestants.length}
                        onChange={(e) => handleRankChange(index, e.target.value)}
                        onClick={(e) => e.target.select()}
                        aria-label={`Change rank for ${contestant.name}, currently ${index + 1}`}
                      />
                    )}
                    
                    <div className="entity-row u-flex-1">
                      <div className="avatar avatar--lg">
                        <img 
                          src={contestant.image_url || 'https://via.placeholder.com/60?text=No+Image'} 
                          alt={`${contestant.name} profile picture`}
                          className="avatar__image"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/60?text=No+Image';
                            e.target.alt = 'Contestant profile placeholder';
                          }}
                        />
                      </div>
                      <div className="entity-row__info">
                        <h3 className="entity-row__name">{contestant.name}</h3>
                        <div className="u-flex u-items-center u-gap-2 u-flex-wrap">
                          <span className="u-text-sm u-text-secondary">{contestant.profession || 'Contestant'}</span>
                          {contestant.is_eliminated && (
                            <StatusBadge status="eliminated" size="sm" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!isLocked && (
                      <div className="u-text-2xl u-text-muted u-cursor-grab u-px-2" aria-hidden="true">
                        ⋮⋮
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isLocked && (
          <div className="u-flex u-justify-center u-mt-8">
            <button 
              type="submit" 
              className={`btn btn--primary btn--lg ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rankings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Ranking;
