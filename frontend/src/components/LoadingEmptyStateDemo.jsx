import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

/**
 * Demo component to showcase loading and empty state components
 * This is for development/testing purposes only
 */
const LoadingEmptyStateDemo = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Loading & Empty State Components Demo</h1>
      
      {/* Spinner Sizes */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Loading Spinners</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <p>Small</p>
            <LoadingSpinner size="sm" />
          </div>
          <div>
            <p>Medium (Default)</p>
            <LoadingSpinner />
          </div>
          <div>
            <p>Large</p>
            <LoadingSpinner size="lg" />
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <p>With Text</p>
          <LoadingSpinner text="Loading data..." />
        </div>
      </section>

      {/* Loading Container */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Centered Loading Container</h2>
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', minHeight: '300px' }}>
          <LoadingSpinner size="lg" text="Loading your team..." centered />
        </div>
      </section>

      {/* Button Loading States */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Button Loading States</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-primary">Normal Button</button>
          <button className="btn-primary btn-loading">Loading Button</button>
          <button className="btn-secondary">Secondary</button>
          <button className="btn-danger">Danger</button>
        </div>
      </section>

      {/* Empty States */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Empty States</h2>
        
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '2rem' }}>
          <EmptyState
            icon="📭"
            title="No items found"
            description="There are no items to display at this time."
          />
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '2rem' }}>
          <EmptyState
            icon="👥"
            title="No team assigned"
            description="Complete your contestant rankings to participate in the draft and get your team."
            action={{
              text: "Rank Contestants",
              onClick: () => alert('Navigate to rankings')
            }}
          />
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '2rem' }}>
          <EmptyState
            icon="🔍"
            title="No search results"
            description="Try adjusting your search criteria or filters."
          />
        </div>
      </section>

      {/* Skeleton Loaders */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Skeleton Loaders</h2>
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1.5rem' }}>
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div style={{ marginTop: '1rem' }}>
            <div className="skeleton skeleton-card"></div>
          </div>
        </div>
      </section>

      {/* Loading Overlay */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Loading Overlay</h2>
        <button 
          className="btn-primary" 
          onClick={() => {
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 3000);
          }}
        >
          Show Loading Overlay (3s)
        </button>
      </section>

      {showOverlay && (
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <p className="loading-text">Processing your request...</p>
        </div>
      )}
    </div>
  );
};

export default LoadingEmptyStateDemo;
