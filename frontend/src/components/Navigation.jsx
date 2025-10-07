import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Navigation = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [predictionStatus, setPredictionStatus] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
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
      {/* Hamburger Menu Button - Mobile Only */}
      <button 
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileMenuOpen}
      >
        <span className="hamburger-icon">
          <span className="hamburger-icon__line"></span>
          <span className="hamburger-icon__line"></span>
          <span className="hamburger-icon__line"></span>
        </span>
      </button>

      {/* Navigation Menu */}
      <ul role="list" className={`navigation__list ${isMobileMenuOpen ? 'navigation__list--mobile-open' : ''}`}>
        <li className="navigation__item">
          <Link 
            to="/home" 
            className={`navigation__link ${isActive('/home') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/home') ? 'page' : undefined}
            onClick={closeMobileMenu}
          >
            Home
          </Link>
        </li>

        <li className="navigation__item">
          <Link 
            to="/predictions" 
            className={`navigation__link ${isActive('/predictions') ? 'navigation__link--active' : ''} ${showPredictionBadge ? 'navigation__link--has-badge' : ''}`}
            aria-current={isActive('/predictions') ? 'page' : undefined}
            onClick={closeMobileMenu}
          >
            Predictions
            {showPredictionBadge && (
              <span className="nav-badge" aria-label="New predictions available">
                !
              </span>
            )}
          </Link>
        </li>

        <li className="navigation__item">
          <Link 
            to="/contestants" 
            className={`navigation__link ${isActive('/contestants') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/contestants') ? 'page' : undefined}
            onClick={closeMobileMenu}
          >
            Contestants
          </Link>
        </li>
        {user?.is_admin && (
          <li className="navigation__item">
            <Link 
              to="/admin" 
              className={`navigation__link ${isActive('/admin') ? 'navigation__link--active' : ''}`}
              aria-current={isActive('/admin') ? 'page' : undefined}
              onClick={closeMobileMenu}
            >
              Admin
            </Link>
          </li>
        )}
        <li className="navigation__item">
          <Link 
            to="/profile" 
            className={`navigation__link ${isActive('/profile') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/profile') ? 'page' : undefined}
            onClick={closeMobileMenu}
          >
            Profile
          </Link>
        </li>
        <li className="navigation__item">
          <button 
            onClick={handleLogout} 
            className="navigation__logout-button"
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
