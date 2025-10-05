import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navigation = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (path) => location.pathname === path;

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
