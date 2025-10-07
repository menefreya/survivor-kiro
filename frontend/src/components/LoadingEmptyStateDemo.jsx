import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import '../styles/06-features/demo.css';

/**
 * Demo component to showcase loading and empty state components
 * This is for development/testing purposes only
 */
const LoadingEmptyStateDemo = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className="demo-container">
      <h1>Loading & Empty State Components Demo</h1>
      
      {/* Spinner Sizes */}
      <section className="demo-section">
        <h2>Loading Spinners</h2>
        <div className="spinner-demo-grid">
          <div className="spinner-demo-item">
            <p>Small</p>
            <LoadingSpinner size="sm" />
          </div>
          <div className="spinner-demo-item">
            <p>Medium (Default)</p>
            <LoadingSpinner />
          </div>
          <div className="spinner-demo-item">
            <p>Large</p>
            <LoadingSpinner size="lg" />
          </div>
        </div>
        
        <div className="spinner-text-demo">
          <p>With Text</p>
          <LoadingSpinner text="Loading data..." />
        </div>
      </section>

      {/* Loading Container */}
      <section className="demo-section">
        <h2>Centered Loading Container</h2>
        <div className="loading-container-demo">
          <LoadingSpinner size="lg" text="Loading your team..." centered />
        </div>
      </section>

      {/* Button Loading States */}
      <section className="demo-section">
        <h2>Button Loading States</h2>
        <div className="button-demo-grid">
          <button className="btn-primary">Primary Button</button>
          <button className="btn-primary btn-loading">Loading Button</button>
          <button className="btn-secondary">Secondary</button>
          <button className="btn-tertiary">Tertiary</button>
          <button className="btn-danger">Danger</button>
          <button className="btn-link">Link Button</button>
        </div>
      </section>

      {/* Empty States */}
      <section className="demo-section">
        <h2>Empty States</h2>
        
        <div className="empty-state-demo-container">
          <EmptyState
            icon="📭"
            title="No items found"
            description="There are no items to display at this time."
          />
        </div>

        <div className="empty-state-demo-container">
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

        <div className="empty-state-demo-container">
          <EmptyState
            icon="🔍"
            title="No search results"
            description="Try adjusting your search criteria or filters."
          />
        </div>
      </section>

      {/* Skeleton Loaders */}
      <section className="demo-section">
        <h2>Skeleton Loaders</h2>
        <div className="skeleton-demo-container">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton-demo-cards">
            <div className="skeleton skeleton-card"></div>
          </div>
        </div>
      </section>

      {/* Loading Overlay */}
      <section className="demo-section">
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
