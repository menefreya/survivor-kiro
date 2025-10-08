import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ScoringRulesCard from './ScoringRulesCard';
import LoadingSpinner from './LoadingSpinner';

import '../App.css';
import '../styles/07-pages/scoring-rules.css';

const ScoringRules = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="scoring-rules-container">
        <LoadingSpinner 
          size="lg" 
          text="Loading scoring rules..." 
          centered={true}
          role="status"
          aria-live="polite"
        />
      </div>
    );
  }

  return (
    <div className="scoring-rules-container">
      {/* Main Content */}
      <div className="scoring-rules-content">
        <ScoringRulesCard />
      </div>


    </div>
  );
};

export default ScoringRules;