/**
 * Comprehensive Error Handling Tests for ContestantPerformance Component
 * Tests all error scenarios, retry functionality, and empty states
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthContext } from '../../context/AuthContext';
import ContestantPerformance from '../ContestantPerformance';
import api from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockedApi = api;

// Mock other components
jest.mock('../ContestantPerformanceRow', () => {
  return function MockContestantPerformanceRow({ contestant }) {
    return <div data-testid={`contestant-row-${contestant.id}`}>{contestant.name}</div>;
  };
});

jest.mock('../EmptyState', () => {
  return function MockEmptyState({ icon, title, description, action }) {
    return (
      <div data-testid="empty-state">
        <div data-testid="empty-state-icon">{icon}</div>
        <div data-testid="empty-state-title">{title}</div>
        <div data-testid="empty-state-description">{description}</div>
        {action && (
          <button data-testid="empty-state-action" onClick={action.onClick}>
            {action.text}
          </button>
        )}
      </div>
    );
  };
});

// Mock network status
const mockOnline = jest.fn();
const mockOffline = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock addEventListener for network events
  window.addEventListener = jest.fn((event, handler) => {
    if (event === 'online') mockOnline.mockImplementation(handler);
    if (event === 'offline') mockOffline.mockImplementation(handler);
  });
  
  window.removeEventListener = jest.fn();
  
  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
  });
});

const renderWithAuth = (user = { id: 1, name: 'Test User' }) => {
  return render(
    <AuthContext.Provider value={{ user }}>
      <ContestantPerformance />
    </AuthContext.Provider>
  );
};

describe('ContestantPerformance Error Handling', () => {
  describe('Network Errors', () => {
    test('handles network connection errors with retry', async () => {
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('🌐');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Connection Problem');
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('Network connection lost');
      });
      
      // Test retry functionality
      const retryButton = screen.getByTestId('empty-state-action');
      expect(retryButton).toHaveTextContent('Retry Connection');
      
      // Mock successful retry
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [{ id: 1, name: 'Test Contestant', total_score: 100 }] }
      });
      
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('contestant-row-1')).toBeInTheDocument();
      });
    });

    test('shows offline status when navigator.onLine is false', async () => {
      navigator.onLine = false;
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('Network connection lost');
      });
    });

    test('automatically retries on network restoration', async () => {
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      
      // Mock successful retry when network comes back online
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [{ id: 1, name: 'Test Contestant', total_score: 100 }] }
      });
      
      // Simulate network coming back online
      act(() => {
        mockOnline();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('contestant-row-1')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Errors', () => {
    test('handles 401 unauthorized errors', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } }
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('🔒');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Session Expired');
        expect(screen.getByTestId('empty-state-action')).toHaveTextContent('Log In Again');
      });
    });

    test('handles 403 forbidden errors', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } }
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('🚫');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Access Denied');
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('You do not have permission');
      });
    });
  });

  describe('Server Errors', () => {
    test('handles 500 server errors', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Internal Server Error' } }
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('⚠️');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Server Error');
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('Server error occurred');
      });
    });

    test('handles 404 not found errors', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not Found' } }
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('🔍');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Data Not Found');
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('Performance data not found');
      });
    });
  });

  describe('Data Validation Errors', () => {
    test('handles invalid data format from server', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { data: 'invalid-format' } // Should be array
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('📊');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Data Error');
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('Invalid data format');
      });
    });

    test('handles missing data property', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {} // Missing data property
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('📊');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('Data Error');
      });
    });
  });

  describe('Empty States', () => {
    test('shows empty state when no contestants exist', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [] }
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-icon')).toHaveTextContent('👥');
        expect(screen.getByTestId('empty-state-title')).toHaveTextContent('No Contestants Found');
        expect(screen.getByTestId('empty-state-description')).toHaveTextContent('There are no contestants to display');
      });
      
      // Should have navigation buttons
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
      expect(screen.getByText('View Rankings')).toBeInTheDocument();
    });

    test('shows refresh button in empty state', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [] }
      });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state-action')).toHaveTextContent('Refresh');
      });
      
      // Test refresh functionality
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [{ id: 1, name: 'New Contestant', total_score: 50 }] }
      });
      
      fireEvent.click(screen.getByTestId('empty-state-action'));
      
      await waitFor(() => {
        expect(screen.getByTestId('contestant-row-1')).toBeInTheDocument();
      });
    });
  });

  describe('Retry Logic', () => {
    test('shows retry count for network errors', async () => {
      mockedApi.get.mockRejectedValue({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      
      // Click retry button multiple times
      const retryButton = screen.getByTestId('empty-state-action');
      
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Retry attempt 1 of 3')).toBeInTheDocument();
      });
    });

    test('disables retry button while retrying', async () => {
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByTestId('empty-state-action');
      
      // Mock slow retry
      mockedApi.get.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(retryButton).toHaveTextContent('Retrying...');
        expect(retryButton).toBeDisabled();
      });
    });

    test('provides page refresh as secondary action', async () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });
      
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Refresh Page'));
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    test('shows loading state initially', () => {
      mockedApi.get.mockImplementationOnce(() => new Promise(() => {})); // Never resolves
      
      renderWithAuth();
      
      // Should show skeleton loader
      expect(document.querySelector('.contestant-performance-row--loading')).toBeInTheDocument();
    });

    test('shows loading state during retry', async () => {
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      
      // Mock slow retry
      mockedApi.get.mockImplementationOnce(() => new Promise(() => {}));
      
      fireEvent.click(screen.getByTestId('empty-state-action'));
      
      // Should show loading state again
      await waitFor(() => {
        expect(document.querySelector('.contestant-performance-row--loading')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh Behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('does not auto-refresh when there are errors', async () => {
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      
      // Clear the mock and advance time
      mockedApi.get.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });
      
      // Should not have made another API call
      expect(mockedApi.get).not.toHaveBeenCalled();
    });

    test('resumes auto-refresh after error is resolved', async () => {
      // Initial error
      mockedApi.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      
      // Successful retry
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [{ id: 1, name: 'Test Contestant', total_score: 100 }] }
      });
      
      fireEvent.click(screen.getByTestId('empty-state-action'));
      
      await waitFor(() => {
        expect(screen.getByTestId('contestant-row-1')).toBeInTheDocument();
      });
      
      // Clear mock and advance time
      mockedApi.get.mockClear();
      mockedApi.get.mockResolvedValueOnce({
        data: { data: [{ id: 1, name: 'Test Contestant', total_score: 100 }] }
      });
      
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });
      
      // Should have made auto-refresh call
      expect(mockedApi.get).toHaveBeenCalledWith('/contestants/performance');
    });
  });
});