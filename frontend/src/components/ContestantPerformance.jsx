import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ContestantPerformanceRow from './ContestantPerformanceRow';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const ContestantPerformance = () => {
  const { user } = useContext(AuthContext);
  const [contestants, setContestants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch contestant performance data with comprehensive error handling
  const fetchContestantPerformance = useCallback(async (isRetryAttempt = false) => {
    try {
      if (isRetryAttempt) {
        setIsRetrying(true);
      }

      const response = await api.get('/contestants/performance');
      const contestantData = response.data.data || response.data;
      
      // Validate response data
      if (!Array.isArray(contestantData)) {
        throw new Error('Invalid data format received from server');
      }
      
      // Add rank to each contestant based on their position in the sorted array
      const rankedContestants = contestantData.map((contestant, index) => ({
        ...contestant,
        rank: index + 1
      }));
      
      setContestants(rankedContestants);
      setError(null);
      setRetryCount(0); // Reset retry count on success
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching contestant performance:', err);
      
      // Determine error type and create appropriate user-friendly message
      let errorMessage = 'Failed to load contestant performance data.';
      let errorType = 'generic';
      
      if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection lost. Please check your internet connection and try again.';
        errorType = 'network';
      } else if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        errorType = 'auth';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to view this data.';
        errorType = 'permission';
      } else if (err.response?.status === 404) {
        errorMessage = 'Performance data not found. The feature may not be available yet.';
        errorType = 'notfound';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error occurred. Our team has been notified. Please try again in a few minutes.';
        errorType = 'server';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
        errorType = 'api';
      } else if (err.message === 'Invalid data format received from server') {
        errorMessage = 'Received invalid data from server. Please try refreshing the page.';
        errorType = 'data';
      }
      
      setError({ message: errorMessage, type: errorType, canRetry: errorType !== 'auth' && errorType !== 'permission' });
      
      // Increment retry count for automatic retry logic
      if (isRetryAttempt) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []);

  // Set document title
  useEffect(() => {
    document.title = 'Contestants - Survivor Fantasy League';
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'Survivor Fantasy League';
    };
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchContestantPerformance();
    }
  }, [user]);

  // Auto-refresh every 30 seconds following Home.jsx pattern (only if no errors)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && !error && !isLoading && !isRetrying) {
        // Silent refresh - don't show loading state for auto-refresh
        fetchContestantPerformance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, error, isLoading, isRetrying]);

  // Handle manual refresh with retry logic
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchContestantPerformance();
  }, [fetchContestantPerformance]);

  // Handle retry with exponential backoff for automatic retries
  const handleRetry = useCallback(() => {
    if (isRetrying) return; // Prevent multiple simultaneous retries
    
    setError(null);
    setIsLoading(true);
    fetchContestantPerformance(true);
  }, [isRetrying, fetchContestantPerformance]);

  // Automatic retry logic for network errors (with exponential backoff)
  useEffect(() => {
    if (error && error.type === 'network' && retryCount < 3) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
      const timeoutId = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1} after ${retryDelay}ms`);
        handleRetry();
      }, retryDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [error, retryCount, handleRetry]);

  // Memoized calculations for performance optimization
  const memoizedContestantData = useMemo(() => {
    if (!contestants || contestants.length === 0) return [];
    
    // Sort contestants by total score (descending) and add performance metrics
    return contestants
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((contestant, index) => ({
        ...contestant,
        rank: index + 1,
        // Pre-calculate display values to avoid recalculation in child components
        formattedAverage: contestant.average_per_episode !== null && contestant.average_per_episode !== undefined
          ? contestant.average_per_episode.toFixed(1)
          : 'N/A',
        hasImage: Boolean(contestant.image_url),
        isTopThree: index < 3
      }));
  }, [contestants]);

  // Memoized skeleton loader count based on expected contestant count
  const skeletonCount = useMemo(() => {
    // Show 8 skeleton rows by default, or match current contestant count if available
    return contestants.length > 0 ? Math.min(contestants.length, 12) : 8;
  }, [contestants.length]);

  // Memoized error state calculations
  const errorState = useMemo(() => {
    if (!error) return null;
    
    const getErrorIcon = (errorType) => {
      switch (errorType) {
        case 'network': return '🌐';
        case 'auth': return '🔒';
        case 'permission': return '🚫';
        case 'notfound': return '🔍';
        case 'server': return '⚠️';
        case 'data': return '📊';
        default: return '⚠️';
      }
    };

    const getErrorTitle = (errorType) => {
      switch (errorType) {
        case 'network': return 'Connection Problem';
        case 'auth': return 'Session Expired';
        case 'permission': return 'Access Denied';
        case 'notfound': return 'Data Not Found';
        case 'server': return 'Server Error';
        case 'data': return 'Data Error';
        default: return 'Unable to Load Performance Data';
      }
    };

    const getActionText = (errorType, isRetrying) => {
      if (isRetrying) return 'Retrying...';
      if (errorType === 'auth') return 'Log In Again';
      if (errorType === 'network') return 'Retry Connection';
      return 'Try Again';
    };

    return {
      icon: getErrorIcon(error.type),
      title: getErrorTitle(error.type),
      actionText: getActionText(error.type, isRetrying)
    };
  }, [error, isRetrying]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (error && error.type === 'network') {
        console.log('Network connection restored, retrying...');
        handleRetry();
      }
    };

    const handleOffline = () => {
      if (!error) {
        setError({ 
          message: 'Network connection lost. Data may be outdated.', 
          type: 'network', 
          canRetry: true 
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // Skeleton loader component matching the final layout
  const ContestantPerformanceSkeleton = () => (
    <div className="contestant-performance-container">
      <div className="contestant-performance-header">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text skeleton-text--60"></div>
      </div>
      <div className="contestant-performance-table">
        <div className="contestant-performance-table-header">
          <div className="skeleton skeleton-text skeleton-text--40"></div>
          <div className="skeleton skeleton-text skeleton-text--40"></div>
          <div className="skeleton skeleton-text skeleton-text--40"></div>
          <div className="skeleton skeleton-text skeleton-text--40"></div>
          <div className="skeleton skeleton-text skeleton-text--40"></div>
        </div>
        <div className="contestant-performance-list">
          {Array.from({ length: skeletonCount }, (_, i) => i + 1).map((i) => (
            <div key={i} className="contestant-performance-row contestant-performance-row--loading">
              <div className="contestant-rank rank-badge-default">
                <div className="skeleton skeleton-text skeleton-text--20"></div>
              </div>
              <div className="entity-row__info">
                <div className="entity-row__avatar">
                  <div className="avatar avatar--lg">
                    <div className="skeleton skeleton-avatar"></div>
                  </div>
                </div>
                <div className="entity-row__info">
                  <div className="skeleton skeleton-text skeleton-text--60"></div>
                  <div className="skeleton skeleton-text skeleton-text--40"></div>
                </div>
              </div>
              <div className="contestant-total-score">
                <div className="skeleton skeleton-text skeleton-text--30"></div>
              </div>
              <div className="contestant-average">
                <div className="skeleton skeleton-text skeleton-text--30"></div>
              </div>
              <div className="contestant-trend">
                <div className="skeleton skeleton-text skeleton-text--50"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="page-container">
        <ContestantPerformanceSkeleton />
      </div>
    );
  }

  // Error state with comprehensive error handling
  if (error && errorState) {
    return (
      <div className="page-container">
        <div className={`empty-state ${error.type === 'network' ? 'empty-state--warning' : 'empty-state--error'}`}>
          <div className="empty-state-icon" aria-hidden="true">
            {errorState.icon}
          </div>
          <h3 className="empty-state-title">{errorState.title}</h3>
          <p className="empty-state-description">{error.message}</p>
          
          {/* Show retry count for network errors */}
          {error.type === 'network' && retryCount > 0 && (
            <p className="error-retry-info">
              Retry attempt {retryCount} of 3
            </p>
          )}
          
          {/* Action buttons */}
          <div className="empty-state-action">
            {error.canRetry && (
              <button 
                className={`btn btn--primary ${isRetrying ? 'btn-loading' : ''}`}
                onClick={error.type === 'auth' ? () => window.location.href = '/login' : handleRetry}
                disabled={isRetrying}
                type="button"
                aria-describedby="error-description"
              >
                {errorState.actionText}
              </button>
            )}
            
            {/* Secondary action for non-auth errors */}
            {error.canRetry && error.type !== 'auth' && (
              <button 
                className="btn btn--secondary"
                onClick={() => window.location.reload()}
                type="button"
                style={{ marginLeft: 'var(--spacing-3)' }}
              >
                Refresh Page
              </button>
            )}
          </div>
          
          {/* Additional help text */}
          <div className="error-help-text" style={{ marginTop: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
            {error.type === 'network' && (
              <p>Check your internet connection. We'll automatically retry when connection is restored.</p>
            )}
            {error.type === 'server' && (
              <p>If the problem persists, please contact support or try again later.</p>
            )}
            {error.type === 'data' && (
              <p>This may be a temporary issue. Refreshing the page often resolves data problems.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state when no contestants exist
  if (!memoizedContestantData || memoizedContestantData.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          icon="👥"
          title="No Contestants Found"
          description="There are no contestants to display at this time. This could mean the season hasn't started yet, or contestant data is still being set up. Check back later or contact an administrator if you believe this is an error."
          action={{
            text: "Refresh",
            onClick: handleRefresh
          }}
        />
        
        {/* Additional help for empty state */}
        <div className="empty-state-help" style={{ 
          textAlign: 'center', 
          marginTop: 'var(--spacing-6)',
          padding: 'var(--spacing-4)',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <h4 style={{ 
            fontSize: 'var(--font-size-lg)', 
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            margin: '0 0 var(--spacing-2) 0'
          }}>
            What's Next?
          </h4>
          <p style={{ 
            fontSize: 'var(--font-size-base)', 
            color: 'var(--color-text-secondary)',
            margin: '0 0 var(--spacing-3) 0',
            lineHeight: 'var(--line-height-relaxed)'
          }}>
            Once contestants are added to the system, you'll be able to see their performance rankings, 
            scores, and trends here. This page will automatically update as new data becomes available.
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn--secondary"
              onClick={() => window.location.href = '/'}
              type="button"
            >
              Go to Dashboard
            </button>
            <button 
              className="btn btn--secondary"
              onClick={() => window.location.href = '/ranking'}
              type="button"
            >
              View Rankings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      
      <div className="contestant-performance-container">
        {/* Page Header */}
        <div className="contestant-performance-header">
          <h1 className="page-title" id="main-content">Season Performance</h1>
          <p className="page-subtitle">
            Track how every contestant performed throughout the season
          </p>
          {lastUpdated && (
            <p className="last-updated" aria-live="polite">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Performance Table - Using semantic table structure */}
        <div className="contestant-performance-table-wrapper">
          <table 
            className="contestant-performance-table" 
            role="table" 
            aria-label="Contestant performance rankings sorted by total score"
            aria-describedby="table-description"
          >
            <caption id="table-description" className="sr-only">
              Table showing all contestants ranked by their total season performance, 
              including rank, name, total score, average points per episode, and performance trend.
              Data is sorted by total score in descending order.
            </caption>
            
            {/* Desktop Table Header - Hidden on mobile */}
            <thead className="contestant-performance-table-header">
              <tr role="row">
                <th 
                  className="header-cell header-rank" 
                  scope="col"
                  aria-sort="descending"
                  aria-label="Rank - sorted by total score descending"
                >
                  <span className="header-text">Rank</span>
                </th>
                <th 
                  className="header-cell header-contestant" 
                  scope="col"
                  aria-sort="none"
                  aria-label="Contestant name and details"
                >
                  <span className="header-text">Contestant</span>
                </th>
                <th 
                  className="header-cell header-total-score" 
                  scope="col"
                  aria-sort="none"
                  aria-label="Total points scored this season"
                >
                  <span className="header-text">Total</span>
                </th>
                <th 
                  className="header-cell header-average" 
                  scope="col"
                  aria-sort="none"
                  aria-label="Average points per episode"
                >
                  <span className="header-text">Avg/Ep</span>
                </th>
                <th 
                  className="header-cell header-trend" 
                  scope="col"
                  aria-sort="none"
                  aria-label="Performance trend indicator"
                >
                  <span className="header-text">Trend</span>
                </th>
              </tr>
            </thead>

            {/* Contestant List */}
            <tbody className="contestant-performance-list">
              {memoizedContestantData.map((contestant, index) => (
                <ContestantPerformanceRow
                  key={contestant.id}
                  contestant={contestant}
                  index={index}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="contestant-performance-footer">
          <p className="performance-note">
            Performance trends compare recent episodes to earlier performance. 
            Data updates automatically every 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContestantPerformance;