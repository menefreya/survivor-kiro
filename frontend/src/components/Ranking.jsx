import { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { RankBadge, StatusBadge } from './badges';

const Ranking = () => {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [contestants, setContestants] = useState([]);
  const [rankedContestants, setRankedContestants] = useState([]);
  const [soleSurvivorId, setSoleSurvivorId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isSoleSurvivorEditMode, setIsSoleSurvivorEditMode] = useState(false);
  const [originalSoleSurvivor, setOriginalSoleSurvivor] = useState(null);

  useEffect(() => {
    if (user) {
      fetchContestants();
    }
  }, [user]);

  useEffect(() => {
    // Check if we're in sole survivor edit mode
    const editMode = searchParams.get('edit');
    setIsSoleSurvivorEditMode(editMode === 'sole-survivor');
  }, [searchParams]);

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
            setOriginalSoleSurvivor(rankingsData.sole_survivor);
          }
          
          // Check if we're in edit mode - if so, don't lock the sole survivor selection
          const editMode = searchParams.get('edit');
          if (editMode === 'sole-survivor') {
            setIsLocked(false); // Allow editing sole survivor
          } else {
            setIsLocked(true);
          }
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
    if (isLocked || isSoleSurvivorEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (isLocked || isSoleSurvivorEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    if (isLocked || isSoleSurvivorEditMode) return;
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
    if (isLocked || isSoleSurvivorEditMode) return;
    
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
    if (isLocked && !isSoleSurvivorEditMode) return;
    setSoleSurvivorId(e.target.value);
  };

  const handleSoleSurvivorUpdate = async (e) => {
    e.preventDefault();
    
    if (!soleSurvivorId || soleSurvivorId === '') {
      setError('Please select a sole survivor pick.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Parse sole survivor ID to integer
      const survivorId = parseInt(soleSurvivorId, 10);

      // Update sole survivor only
      const response = await api.put(`/sole-survivor/${user.id}`, {
        contestant_id: survivorId
      });

      setSuccess(true);
      
      // Show success message with draft replacement info if applicable
      if (response.data.draft_replacement) {
        const replacement = response.data.draft_replacement;
        setError(null);
        setSuccess(`Sole survivor updated successfully! Your draft pick ${replacement.replaced_contestant.name} has been automatically replaced with ${replacement.new_draft_pick.name}.`);
      } else {
        setSuccess('Sole survivor updated successfully!');
      }
      
      // Navigate back to home after a short delay
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err) {
      console.error('Error updating sole survivor:', err);
      setError(err.response?.data?.error || 'Failed to update sole survivor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If in sole survivor edit mode, handle differently
    if (isSoleSurvivorEditMode) {
      return handleSoleSurvivorUpdate(e);
    }
    
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
        <h1 className="layout-header__title">
          {isSoleSurvivorEditMode ? 'Change Sole Survivor' : 'Rank Contestants'}
        </h1>
        {isSoleSurvivorEditMode && (
          <button 
            className="btn btn--secondary"
            onClick={() => navigate('/home')}
            aria-label="Cancel and return to home"
          >
            Cancel
          </button>
        )}
      </div>
      
      {error && <div className="form-message form-error" role="alert">{error}</div>}
      {success && <div className="form-message form-success" role="status">Rankings submitted successfully!</div>}
      
      {isSoleSurvivorEditMode && originalSoleSurvivor && (
        <div className="card card-warning u-mb-6" role="status" aria-live="polite">
          <div className="card-body">
            <h3 className="card-title">Replace Eliminated Sole Survivor</h3>
            <p className="card-text">
              Your current sole survivor <strong>{originalSoleSurvivor.name}</strong> has been eliminated. 
              Select a new contestant from the available options below.
            </p>
            {originalSoleSurvivor.is_eliminated && (
              <div className="u-mt-3">
                <span className="status-badge status-badge--eliminated">
                  {originalSoleSurvivor.name} - Eliminated
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {isLocked && !isSoleSurvivorEditMode && (
        <div className="card card-warning u-mb-6" role="status" aria-live="polite">
          <div className="card-body u-text-center">
            <p className="card-text">
              Your rankings have been submitted and are now locked. The draft will begin once all players have submitted their rankings.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {(isLocked && !isSoleSurvivorEditMode) ? (
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
                  <strong>
                    {isSoleSurvivorEditMode ? 'New Sole Survivor Pick:' : 'Sole Survivor Pick:'} 
                  </strong> 
                  {isSoleSurvivorEditMode ? 'Select from active contestants' : 'Who do you think will win?'}
                </label>
                <select
                  id="sole-survivor"
                  className="form-select"
                  value={soleSurvivorId}
                  onChange={handleSoleSurvivorChange}
                  disabled={isLocked && !isSoleSurvivorEditMode}
                  required
                >
                  <option value="">-- Select Sole Survivor --</option>
                  {contestants
                    .filter(contestant => isSoleSurvivorEditMode ? !contestant.is_eliminated : true)
                    .map((contestant) => (
                    <option key={contestant.id} value={contestant.id}>
                      {contestant.name} {contestant.is_eliminated ? '(Eliminated)' : ''}
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
              {isSoleSurvivorEditMode ? 'Your Current Rankings' : (isLocked ? 'Your Rankings' : 'Rank Contestants')}
            </h2>
            {!isLocked && !isSoleSurvivorEditMode && (
              <p className="card-text u-text-sm u-text-secondary u-mt-2">
                Drag and drop contestants or type a rank number to reorder them (1st = highest preference).
              </p>
            )}
            {isSoleSurvivorEditMode && (
              <p className="card-text u-text-sm u-text-secondary u-mt-2">
                Your current contestant rankings (read-only while changing sole survivor).
              </p>
            )}
          </div>
          <div className="card-body">
            <div className="layout-stack" role="list" aria-label="Contestant rankings">
              {rankedContestants.map((contestant, index) => (
                <div
                  key={contestant.id}
                  className={`card card-interactive u-p-4 u-transition-all ${draggedIndex === index ? 'u-opacity-50 u-scale-98' : ''} ${(isLocked || isSoleSurvivorEditMode) ? 'u-cursor-default u-bg-secondary' : 'u-cursor-move'}`}
                  draggable={!isLocked && !isSoleSurvivorEditMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  role="listitem"
                  aria-label={`${contestant.name}, rank ${index + 1} of ${rankedContestants.length}${contestant.is_eliminated ? ', eliminated' : ''}`}
                  tabIndex={(isLocked || isSoleSurvivorEditMode) ? -1 : 0}
                >
                  <div className="u-flex u-items-center u-w-full">
                    {(isLocked || isSoleSurvivorEditMode) ? (
                      <div className="u-mr-4">
                        <RankBadge rank={index + 1} size="lg" />
                      </div>
                    ) : (
                      <input
                        type="number"
                        className="form-input u-w-24 u-text-center u-text-lg u-font-bold u-text-success u-mr-4"
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
                    
                    {!isLocked && !isSoleSurvivorEditMode && (
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

        {(!isLocked || isSoleSurvivorEditMode) && (
          <div className="u-flex u-justify-center u-mt-8">
            <button 
              type="submit" 
              className={`btn btn--primary btn--lg ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 
                (isSoleSurvivorEditMode ? 'Updating...' : 'Submitting...') : 
                (isSoleSurvivorEditMode ? 'Update Sole Survivor' : 'Submit Rankings')
              }
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Ranking;
