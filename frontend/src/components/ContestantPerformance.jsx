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
      // Enhanced error handling: ensure event count fields exist with proper defaults
      const rankedContestants = contestantData.map((contestant, index) => {
        // Validate and sanitize contestant data
        const sanitizedContestant = {
          ...contestant,
          rank: index + 1,
          // Ensure event count fields exist with proper defaults
          idols_found: contestant.idols_found !== undefined ? contestant.idols_found : null,
          reward_wins: contestant.reward_wins !== undefined ? contestant.reward_wins : null,
          immunity_wins: contestant.immunity_wins !== undefined ? contestant.immunity_wins : null
        };

        // Log warning if event data is missing (for debugging)
        if (contestant.idols_found === undefined || contestant.reward_wins === undefined || contestant.immunity_wins === undefined) {
          console.warn('Missing event data for contestant:', contestant.name, {
            idols_found: contestant.idols_found,
            reward_wins: contestant.reward_wins,
            immunity_wins: contestant.immunity_wins
          });
        }

        return sanitizedContestant;
      });

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
    <div className="content-container">
      <div className="layout-header">
        <div className="u-bg-tertiary u-rounded-md u-h-12 u-w-3/4 u-mb-4 u-animate-pulse"></div>
        <div className="u-bg-tertiary u-rounded-md u-h-6 u-w-1/2 u-animate-pulse"></div>
      </div>
      <div className="card">
        <div className="card-body u-p-0">
          <div className="u-overflow-x-auto">
            <table className="u-border-collapse u-mx-auto" style={{ width: 'auto', minWidth: '1000px' }}>
              <thead className="u-bg-tertiary">
                <tr>
                  <th className="u-p-4" style={{ width: '80px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-12 u-animate-pulse"></div></th>
                  <th className="u-p-4" style={{ width: '120px', minWidth: '120px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-20 u-animate-pulse"></div></th>
                  <th className="u-p-4" style={{ width: '120px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-12 u-animate-pulse"></div></th>
                  <th className="u-p-4" style={{ width: '100px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-16 u-animate-pulse"></div></th>
                  <th className="u-p-3" style={{ width: '110px', minWidth: '110px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-16 u-animate-pulse"></div></th>
                  <th className="u-p-3" style={{ width: '110px', minWidth: '110px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-16 u-animate-pulse"></div></th>
                  <th className="u-p-3" style={{ width: '120px', minWidth: '120px' }}><div className="u-bg-quaternary u-rounded u-h-4 u-w-16 u-animate-pulse"></div></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: skeletonCount }, (_, i) => i + 1).map((i) => (
                  <tr key={i} className="u-border-b u-border-subtle">
                    <td className="u-p-4">
                      <div className="badge badge--md u-bg-tertiary u-animate-pulse"></div>
                    </td>
                    <td className="u-p-4">
                      <div className="entity-row entity-row--compact">
                        <div className="avatar avatar--lg u-bg-tertiary u-animate-pulse"></div>
                        <div className="u-flex u-flex-col u-gap-1">
                          <div className="u-bg-tertiary u-rounded u-h-4 u-w-24 u-animate-pulse"></div>
                          <div className="u-bg-tertiary u-rounded u-h-3 u-w-16 u-animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="u-p-4 u-text-center">
                      <div className="u-bg-tertiary u-rounded u-h-4 u-w-8 u-mx-auto u-animate-pulse"></div>
                    </td>
                    <td className="u-p-3 u-text-center">
                      <div className="u-bg-tertiary u-rounded u-h-4 u-w-8 u-mx-auto u-animate-pulse"></div>
                    </td>
                    <td className="u-p-3 u-text-center">
                      <div className="u-bg-tertiary u-rounded u-h-4 u-w-8 u-mx-auto u-animate-pulse"></div>
                    </td>
                    <td className="u-p-3 u-text-center">
                      <div className="u-bg-tertiary u-rounded u-h-4 u-w-8 u-mx-auto u-animate-pulse"></div>
                    </td>
                    <td className="u-p-4 u-text-center">
                      <div className="u-bg-tertiary u-rounded u-h-4 u-w-8 u-mx-auto u-animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Loading state with skeleton loaders
  if (isLoading) {
    return <ContestantPerformanceSkeleton />;
  }

  // Error state with comprehensive error handling
  if (error && errorState) {
    return (
      <div className="content-container">
        <div className={`card ${error.type === 'network' ? 'card-warning' : 'card-danger'}`}>
          <div className="card-body u-text-center">
            <div className="u-text-4xl u-mb-4" aria-hidden="true">
              {errorState.icon}
            </div>
            <h2 className="card-title u-mb-4">{errorState.title}</h2>
            <p className="card-text u-mb-4">{error.message}</p>

            {/* Show retry count for network errors */}
            {error.type === 'network' && retryCount > 0 && (
              <p className="u-text-sm u-text-secondary u-mb-4">
                Retry attempt {retryCount} of 3
              </p>
            )}

            {/* Action buttons */}
            <div className="u-flex u-gap-3 u-justify-center u-flex-wrap">
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
                >
                  Refresh Page
                </button>
              )}
            </div>

            {/* Additional help text */}
            <div className="u-mt-6 u-text-sm u-text-tertiary">
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
      </div>
    );
  }

  // Empty state when no contestants exist
  if (!memoizedContestantData || memoizedContestantData.length === 0) {
    return (
      <div className="content-container">
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
        <div className="card u-mt-6">
          <div className="card-body u-text-center">
            <h3 className="card-title u-mb-4">What's Next?</h3>
            <p className="card-text u-mb-6">
              Once contestants are added to the system, you'll be able to see their performance rankings,
              scores, and trends here. This page will automatically update as new data becomes available.
            </p>
            <div className="u-flex u-gap-3 u-justify-center u-flex-wrap">
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
      </div>
    );
  }

  return (
    <div className="content-container">
      {/* Page Header */}
      <div className="layout-header">
        <h1 className="layout-header__title" id="main-content">Season Performance</h1>
        <p className="layout-header__subtitle">
          Track how every contestant performed throughout the season
        </p>
        {lastUpdated && (
          <p className="u-text-sm u-text-secondary u-mt-2" aria-live="polite">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Performance Table - Using semantic table structure */}
      <div className="card">
        <div className="card-body u-p-0">
          <div className="u-overflow-x-auto">
            <table
              className="u-border-collapse u-mx-auto"
              style={{ width: 'auto', minWidth: '1000px' }}
              role="table"
              aria-label="Contestant performance rankings sorted by total score"
              aria-describedby="table-description"
            >
              <caption id="table-description" className="u-sr-only">
                Table showing all contestants ranked by their total season performance,
                including rank, name, total score with trend indicator, and average points per episode.
                Data is sorted by total score in descending order.
              </caption>

              {/* Desktop Table Header */}
              <thead className="u-bg-tertiary">
                <tr role="row">
                  <th
                    className="u-p-4 u-text-left u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary"
                    scope="col"
                    aria-sort="descending"
                    aria-label="Rank - sorted by total score descending"
                    style={{ width: '80px' }}
                  >
                    Rank
                  </th>
                  <th
                    className="u-p-4 u-text-left u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary"
                    scope="col"
                    aria-sort="none"
                    aria-label="Contestant name and details"
                    style={{ width: '120px', minWidth: '120px' }}
                  >
                    Contestant
                  </th>
                  <th
                    className="u-p-4 u-text-center u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary"
                    scope="col"
                    aria-sort="none"
                    aria-label="Total points scored this season with trend indicator"
                    style={{ width: '75px' }}
                  >
                    Total
                  </th>
                  <th
                    className="u-p-4 u-text-center u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary"
                    scope="col"
                    aria-sort="none"
                    aria-label="Average points per episode"
                    style={{ width: '100px' }}
                  >
                    Avg/Ep
                  </th>
                  <th
                    className="u-p-3 u-text-center u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary header-idols-found"
                    scope="col"
                    aria-sort="none"
                    aria-label="Number of hidden immunity idols found by contestant"
                    style={{ width: '110px', minWidth: '110px' }}
                  >
                    Idols Found
                  </th>
                  <th
                    className="u-p-3 u-text-center u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary header-reward-wins"
                    scope="col"
                    aria-sort="none"
                    aria-label="Number of team reward challenges won by contestant"
                    style={{ width: '110px', minWidth: '110px' }}
                  >
                    Reward Wins
                  </th>
                  <th
                    className="u-p-3 u-text-center u-border-b u-border-subtle u-text-sm u-font-semibold u-text-secondary header-immunity-wins"
                    scope="col"
                    aria-sort="none"
                    aria-label="Number of team immunity challenges won by contestant"
                    style={{ width: '120px', minWidth: '120px' }}
                  >
                    Immunity Wins
                  </th>
                </tr>
              </thead>

              {/* Contestant List */}
              <tbody>
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
        </div>
      </div>

      {/* Footer Info */}
      <div className="u-text-center u-mt-6">
        <p className="u-text-sm u-text-secondary">
          Trend indicators (↗ ↘ →) show performance direction compared to earlier episodes.
          Data updates automatically every 30 seconds.
        </p>
      </div>
    </div>
  );
};

export default ContestantPerformance;