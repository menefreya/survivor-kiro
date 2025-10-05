import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navigation = () => {
  const { isAuthenticated, user } = useContext(AuthContext);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navigation">
      <ul>
        <li><Link to="/home">Home</Link></li>
        <li><Link to="/ranking">Ranking</Link></li>
        {user?.is_admin && (
          <li><Link to="/admin">Admin</Link></li>
        )}
        <li><Link to="/profile">Profile</Link></li>
      </ul>
    </nav>
  );
};

export default Navigation;
