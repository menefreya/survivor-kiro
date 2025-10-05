import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Navigation = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [predictionStatus, setPredictionStatus] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      checkPredictionStatus();
    }
  }, [isAuthenticated]);

  const checkPredictionStatus = async () => {
    try {
      const response = await api.get('/predictions/status');
      setPredictionStatus(response.data);
    } catch (err) {
      console.error('Error checking prediction status:', err);
      setPredictionStatus(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (path) => location.pathname === path;
  
  // Show badge if predictions are available and not submitted
  const showPredictionBadge = predictionStatus && 
                               predictionStatus.predictions_available && 
                               !predictionStatus.has_submitted;

  return (
    <nav className="navigation" aria-label="Main navigation">
      <ul role="list">
        <li>
          <Link 
            to="/home" 
            aria-current={isActive('/home') ? 'page' : undefined}
          >
            Home
          </Link>
        </li>
        <li>
          <Link 
            to="/ranking" 
            aria-current={isActive('/ranking') ? 'page' : undefined}
          >
            Ranking
          </Link>
        </li>
        <li>
          <Link 
            to="/predictions" 
            aria-current={isActive('/predictions') ? 'page' : undefined}
            className={showPredictionBadge ? 'has-badge' : ''}
          >
            Predictions
            {showPredictionBadge && (
              <span className="nav-badge" aria-label="New predictions available">
                !
              </span>
            )}
          </Link>
        </li>
        {user?.is_admin && (
          <li>
            <Link 
              to="/admin" 
              aria-current={isActive('/admin') ? 'page' : undefined}
            >
              Admin
            </Link>
          </li>
        )}
        <li>
          <Link 
            to="/profile" 
            aria-current={isActive('/profile') ? 'page' : undefined}
          >
            Profile
          </Link>
        </li>
        <li>
          <button 
            onClick={handleLogout} 
            className="logout-link"
            aria-label="Logout from your account"
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
