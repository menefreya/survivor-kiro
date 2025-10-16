/**
 * Test file for sole survivor edit mode functionality
 * This tests the URL parameter handling and UI changes
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Ranking from '../Ranking.jsx';

// Mock the API
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  has_submitted_rankings: true
};

const mockContestants = [
  { id: 1, name: 'Alice', profession: 'Teacher', is_eliminated: false, total_score: 50 },
  { id: 2, name: 'Bob', profession: 'Engineer', is_eliminated: true, total_score: 30 },
  { id: 3, name: 'Charlie', profession: 'Doctor', is_eliminated: false, total_score: 40 }
];

const renderWithRouter = (initialEntries = ['/ranking']) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user: mockUser }}>
        <Ranking />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Sole Survivor Edit Mode', () => {
  it('should show edit mode when URL has edit=sole-survivor parameter', async () => {
    // Mock the API responses
    const api = await import('../../services/api');
    api.default.get.mockResolvedValueOnce({ data: mockContestants });
    api.default.get.mockResolvedValueOnce({
      data: {
        rankings: [],
        sole_survivor: { id: 2, name: 'Bob', is_eliminated: true }
      }
    });

    // Set up URL with edit parameter
    window.history.pushState({}, '', '/ranking?edit=sole-survivor');

    renderWithRouter(['/ranking?edit=sole-survivor']);

    // Should show edit mode title
    expect(screen.getByText('Change Sole Survivor')).toBeInTheDocument();
    
    // Should show cancel button
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    
    // Should show warning about eliminated sole survivor
    expect(screen.getByText(/has been eliminated/)).toBeInTheDocument();
  });

  it('should filter out eliminated contestants in edit mode dropdown', async () => {
    const api = await import('../../services/api');
    api.default.get.mockResolvedValueOnce({ data: mockContestants });
    api.default.get.mockResolvedValueOnce({
      data: {
        rankings: [],
        sole_survivor: { id: 2, name: 'Bob', is_eliminated: true }
      }
    });

    window.history.pushState({}, '', '/ranking?edit=sole-survivor');
    renderWithRouter(['/ranking?edit=sole-survivor']);

    // Wait for component to load
    await screen.findByText('Change Sole Survivor');

    // Should only show non-eliminated contestants in dropdown
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    
    // Bob (eliminated) should not be in the options when in edit mode
    // Alice and Charlie (not eliminated) should be available
    const options = dropdown.querySelectorAll('option');
    const optionTexts = Array.from(options).map(option => option.textContent);
    
    expect(optionTexts).toContain('Alice');
    expect(optionTexts).toContain('Charlie');
    expect(optionTexts.some(text => text.includes('Bob') && !text.includes('(Eliminated)'))).toBe(false);
  });

  it('should hide rankings section in edit mode', async () => {
    const api = await import('../../services/api');
    api.default.get.mockResolvedValueOnce({ data: mockContestants });
    api.default.get.mockResolvedValueOnce({
      data: {
        rankings: [],
        sole_survivor: { id: 2, name: 'Bob', is_eliminated: true }
      }
    });

    window.history.pushState({}, '', '/ranking?edit=sole-survivor');
    renderWithRouter(['/ranking?edit=sole-survivor']);

    await screen.findByText('Change Sole Survivor');

    // Rankings section should not be visible
    expect(screen.queryByText('Rank Contestants')).not.toBeInTheDocument();
    expect(screen.queryByText('Your Rankings')).not.toBeInTheDocument();
  });

  it('should show update button instead of submit button in edit mode', async () => {
    const api = await import('../../services/api');
    api.default.get.mockResolvedValueOnce({ data: mockContestants });
    api.default.get.mockResolvedValueOnce({
      data: {
        rankings: [],
        sole_survivor: { id: 2, name: 'Bob', is_eliminated: true }
      }
    });

    window.history.pushState({}, '', '/ranking?edit=sole-survivor');
    renderWithRouter(['/ranking?edit=sole-survivor']);

    await screen.findByText('Change Sole Survivor');

    // Should show update button instead of submit
    expect(screen.getByText('Update Sole Survivor')).toBeInTheDocument();
    expect(screen.queryByText('Submit Rankings')).not.toBeInTheDocument();
  });
});