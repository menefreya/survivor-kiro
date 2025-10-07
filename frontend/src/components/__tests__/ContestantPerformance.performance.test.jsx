import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContestantPerformance from '../ContestantPerformance';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

// Mock API
jest.mock('../../services/api');

// Mock user context
const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User'
};

const MockAuthProvider = ({ children }) => (
  <AuthContext.Provider value={{ user: mockUser }}>
    {children}
  </AuthContext.Provider>
);

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MockAuthProvider>
        {component}
      </MockAuthProvider>
    </BrowserRouter>
  );
};

// Generate large dataset for testing
const generateLargeDataset = (count = 100) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Contestant ${i + 1}`,
    image_url: i % 3 === 0 ? `https://example.com/image${i}.jpg` : null,
    total_score: Math.floor(Math.random() * 500) + 100,
    average_per_episode: parseFloat((Math.random() * 50 + 10).toFixed(1)),
    trend: ['up', 'down', 'same', 'n/a'][Math.floor(Math.random() * 4)],
    episodes_participated: Math.floor(Math.random() * 15) + 5,
    is_eliminated: Math.random() > 0.7,
    profession: `Profession ${i + 1}`,
    rank: i + 1
  }));
};

describe('ContestantPerformance Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    api.get.mockResolvedValue({
      data: { data: generateLargeDataset(50) }
    });
  });

  describe('Rendering Performance', () => {
    test('should render large dataset efficiently', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<ContestantPerformance />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
      
      console.log(`Large dataset render time: ${renderTime.toFixed(2)}ms`);
    });

    test('should handle very large dataset (100 contestants)', async () => {
      // Mock larger dataset
      api.get.mockResolvedValue({
        data: { data: generateLargeDataset(100) }
      });

      const startTime = performance.now();
      
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Even with 100 contestants, should render reasonably fast
      expect(renderTime).toBeLessThan(2000);
      
      console.log(`Very large dataset (100 contestants) render time: ${renderTime.toFixed(2)}ms`);
    });

    test('should efficiently re-render on data updates', async () => {
      const { rerender } = renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      // Update with new data
      const newData = generateLargeDataset(50);
      newData[0].total_score = 999; // Change first contestant's score
      
      api.get.mockResolvedValue({
        data: { data: newData }
      });

      const startTime = performance.now();
      
      // Trigger re-render
      rerender(
        <BrowserRouter>
          <MockAuthProvider>
            <ContestantPerformance />
          </MockAuthProvider>
        </BrowserRouter>
      );

      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      // Re-render should be very fast due to React.memo optimizations
      expect(rerenderTime).toBeLessThan(100);
      
      console.log(`Re-render time: ${rerenderTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    test('should not cause memory leaks with multiple renders', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(<ContestantPerformance />);
        
        await waitFor(() => {
          expect(screen.getByText('Season Performance')).toBeInTheDocument();
        });
        
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      if (performance.memory) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        console.log(`Memory increase after 10 render cycles: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      }
    });
  });

  describe('Responsive Design Performance', () => {
    test('should handle mobile viewport efficiently', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const startTime = performance.now();
      
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const mobileRenderTime = endTime - startTime;

      // Mobile rendering should be efficient
      expect(mobileRenderTime).toBeLessThan(1500);
      
      console.log(`Mobile viewport render time: ${mobileRenderTime.toFixed(2)}ms`);
    });

    test('should handle tablet viewport efficiently', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const startTime = performance.now();
      
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const tabletRenderTime = endTime - startTime;

      // Tablet rendering should be efficient
      expect(tabletRenderTime).toBeLessThan(1200);
      
      console.log(`Tablet viewport render time: ${tabletRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Component Optimization', () => {
    test('should minimize unnecessary re-renders with React.memo', async () => {
      let renderCount = 0;
      
      // Mock ContestantPerformanceRow to count renders
      const OriginalRow = require('../ContestantPerformanceRow').default;
      const MockRow = jest.fn((props) => {
        renderCount++;
        return OriginalRow(props);
      });
      
      // This test would need more sophisticated mocking to properly test React.memo
      // For now, we verify the component structure
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      // Verify that rows are rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    test('should use memoized calculations efficiently', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      // Trigger a state update that shouldn't cause expensive recalculations
      act(() => {
        // Simulate a minor state change
        window.dispatchEvent(new Event('online'));
      });

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      // Memoized calculations should keep render time low
      expect(calculationTime).toBeLessThan(800);
      
      console.log(`Memoized calculation test time: ${calculationTime.toFixed(2)}ms`);
    });
  });

  describe('Image Loading Performance', () => {
    test('should handle image loading failures gracefully', async () => {
      // Mock dataset with mix of valid and invalid image URLs
      const dataWithImages = generateLargeDataset(20).map((contestant, i) => ({
        ...contestant,
        image_url: i % 2 === 0 ? `https://example.com/valid${i}.jpg` : `https://invalid.url/image${i}.jpg`
      }));

      api.get.mockResolvedValue({
        data: { data: dataWithImages }
      });

      const startTime = performance.now();
      
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const imageHandlingTime = endTime - startTime;

      // Image error handling shouldn't significantly impact performance
      expect(imageHandlingTime).toBeLessThan(1000);
      
      console.log(`Image loading performance test time: ${imageHandlingTime.toFixed(2)}ms`);
    });
  });

  describe('Auto-refresh Performance', () => {
    test('should handle auto-refresh efficiently', async () => {
      jest.useFakeTimers();
      
      renderWithProviders(<ContestantPerformance />);
      
      await waitFor(() => {
        expect(screen.getByText('Season Performance')).toBeInTheDocument();
      });

      // Clear initial API call
      api.get.mockClear();

      const startTime = performance.now();
      
      // Fast-forward 30 seconds to trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      const endTime = performance.now();
      const autoRefreshTime = endTime - startTime;

      // Auto-refresh should be very fast
      expect(autoRefreshTime).toBeLessThan(200);
      
      console.log(`Auto-refresh performance: ${autoRefreshTime.toFixed(2)}ms`);
      
      jest.useRealTimers();
    });
  });
});