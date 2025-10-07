/**
 * Image Loading and Error Handling Tests for ContestantPerformanceRow Component
 * Tests image loading states, error handling, and retry functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContestantPerformanceRow from '../ContestantPerformanceRow';

// Mock TrendIndicator component
jest.mock('../TrendIndicator', () => {
  return function MockTrendIndicator({ trend, contestantName }) {
    return <div data-testid="trend-indicator">{trend}</div>;
  };
});

const mockContestant = {
  id: 1,
  name: 'Test Contestant',
  image_url: 'https://example.com/image.jpg',
  total_score: 100,
  average_per_episode: 20.5,
  trend: 'up',
  episodes_participated: 5,
  rank: 1,
  profession: 'Teacher'
};

describe('ContestantPerformanceRow Image Handling', () => {
  describe('Image Loading States', () => {
    test('shows skeleton loader while image is loading', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      // Image should be hidden initially while loading
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      expect(image).toHaveStyle({ display: 'none' });
      
      // Skeleton loader should be visible
      expect(document.querySelector('.skeleton-avatar')).toBeInTheDocument();
    });

    test('shows image after successful load', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate successful image load
      fireEvent.load(image);
      
      expect(image).toHaveStyle({ display: 'block' });
      expect(document.querySelector('.skeleton-avatar')).not.toBeInTheDocument();
    });

    test('shows initials when no image URL provided', () => {
      const contestantNoImage = { ...mockContestant, image_url: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={contestantNoImage} />
          </tbody>
        </table>
      );
      
      // Should not render image element
      expect(screen.queryByAltText(/Profile photo/)).not.toBeInTheDocument();
      
      // Should show initials
      const initials = screen.getByLabelText(/Test Contestant profile avatar.*showing initials TC/);
      expect(initials).toBeInTheDocument();
      expect(initials).toHaveTextContent('TC');
    });
  });

  describe('Image Error Handling', () => {
    test('shows initials when image fails to load', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate image load error
      fireEvent.error(image);
      
      // Image should be hidden
      expect(image).toHaveStyle({ display: 'none' });
      
      // Initials should be visible with error indication
      const initials = screen.getByLabelText(/Test Contestant profile avatar.*image failed to load.*showing initials TC/);
      expect(initials).toBeInTheDocument();
      expect(initials).toHaveTextContent('TC');
    });

    test('shows retry button when image fails to load', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate image load error
      fireEvent.error(image);
      
      // Retry button should appear
      const retryButton = screen.getByLabelText(/Retry loading profile image for Test Contestant/);
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('title', 'Click to retry loading image');
    });

    test('retry button attempts to reload image', async () => {
      // Mock Image constructor
      const mockImage = {
        onload: null,
        onerror: null,
        src: ''
      };
      
      global.Image = jest.fn(() => mockImage);
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate initial image load error
      fireEvent.error(image);
      
      const retryButton = screen.getByLabelText(/Retry loading profile image for Test Contestant/);
      
      // Click retry button
      fireEvent.click(retryButton);
      
      // Should create new Image instance
      expect(global.Image).toHaveBeenCalled();
      expect(mockImage.src).toBe(mockContestant.image_url);
      
      // Simulate successful retry
      mockImage.onload();
      
      await waitFor(() => {
        expect(image).toHaveStyle({ display: 'block' });
      });
    });

    test('handles retry failure gracefully', async () => {
      const mockImage = {
        onload: null,
        onerror: null,
        src: ''
      };
      
      global.Image = jest.fn(() => mockImage);
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate initial image load error
      fireEvent.error(image);
      
      const retryButton = screen.getByLabelText(/Retry loading profile image for Test Contestant/);
      
      // Click retry button
      fireEvent.click(retryButton);
      
      // Simulate retry failure
      mockImage.onerror();
      
      // Should still show initials and retry button
      expect(screen.getByLabelText(/Test Contestant profile avatar.*image failed to load/)).toBeInTheDocument();
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Initials Generation', () => {
    test('generates correct initials for single name', () => {
      const singleNameContestant = { ...mockContestant, name: 'Madonna', image_url: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={singleNameContestant} />
          </tbody>
        </table>
      );
      
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    test('generates correct initials for multiple names', () => {
      const multiNameContestant = { ...mockContestant, name: 'Mary Jane Watson', image_url: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={multiNameContestant} />
          </tbody>
        </table>
      );
      
      expect(screen.getByText('MW')).toBeInTheDocument();
    });

    test('handles empty name gracefully', () => {
      const emptyNameContestant = { ...mockContestant, name: '', image_url: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={emptyNameContestant} />
          </tbody>
        </table>
      );
      
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    test('handles undefined name gracefully', () => {
      const undefinedNameContestant = { ...mockContestant, name: undefined, image_url: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={undefinedNameContestant} />
          </tbody>
        </table>
      );
      
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('provides proper alt text for images', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText('Profile photo of Test Contestant, Teacher');
      expect(image).toBeInTheDocument();
    });

    test('provides proper alt text when no profession', () => {
      const noProfessionContestant = { ...mockContestant, profession: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={noProfessionContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText('Profile photo of Test Contestant');
      expect(image).toBeInTheDocument();
    });

    test('provides proper aria labels for initials', () => {
      const noImageContestant = { ...mockContestant, image_url: null };
      
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={noImageContestant} />
          </tbody>
        </table>
      );
      
      const initials = screen.getByLabelText('Test Contestant profile avatar showing initials TC');
      expect(initials).toBeInTheDocument();
      expect(initials).toHaveAttribute('role', 'img');
    });

    test('updates aria label when image fails to load', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate image load error
      fireEvent.error(image);
      
      // Aria label should indicate image failed to load
      const initials = screen.getByLabelText(/Test Contestant profile avatar.*image failed to load.*showing initials TC/);
      expect(initials).toBeInTheDocument();
    });

    test('retry button has proper accessibility attributes', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // Simulate image load error
      fireEvent.error(image);
      
      const retryButton = screen.getByLabelText('Retry loading profile image for Test Contestant');
      expect(retryButton).toHaveAttribute('title', 'Click to retry loading image');
      expect(retryButton).toHaveAttribute('aria-label', 'Retry loading profile image for Test Contestant');
    });
  });

  describe('Visual States', () => {
    test('applies correct CSS classes for different states', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      // Initial loading state
      const initialsContainer = document.querySelector('.contestant-initials');
      expect(initialsContainer).toHaveClass('u-flex'); // Should be visible during loading
      
      const image = screen.getByAltText(/Profile photo of Test Contestant/);
      
      // After successful load
      fireEvent.load(image);
      
      expect(initialsContainer).toHaveClass('u-hidden'); // Should be hidden after image loads
    });

    test('shows loading skeleton during image load', () => {
      render(
        <table>
          <tbody>
            <ContestantPerformanceRow contestant={mockContestant} />
          </tbody>
        </table>
      );
      
      const loadingContainer = document.querySelector('.contestant-image-loading');
      expect(loadingContainer).toBeInTheDocument();
      
      const skeleton = document.querySelector('.skeleton-avatar');
      expect(skeleton).toBeInTheDocument();
    });
  });
});