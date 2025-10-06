import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../styles/07-pages/profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdateProfileImage = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsUpdating(true);

    try {
      await api.put(`/players/${user.id}`, {
        profile_image_url: profileImageUrl
      });

      // Update user in context with new profile image
      const updatedUser = { ...user, profile_image_url: profileImageUrl };
      updateUser(updatedUser);

      setSuccess('Profile image updated successfully!');
      setProfileImageUrl('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile image');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return <div className="profile-container">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      
      <div className="profile-info">
        <div className="profile-image-section" aria-label="Profile picture">
          {user.profile_image_url && user.profile_image_url.startsWith('http') ? (
            <img 
              src={user.profile_image_url} 
              alt={`${user.name}'s profile picture`}
              className="profile-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                e.target.alt = 'Default profile placeholder image';
              }}
            />
          ) : (
            <div className="profile-image-placeholder" role="img" aria-label={`${user.name}'s profile initial`}>
              <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="profile-details">
          <div className="profile-field">
            <label>Name:</label>
            <span>{user.name}</span>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span>{user.email}</span>
          </div>
          {user.is_admin && (
            <div className="profile-field">
              <label>Role:</label>
              <span className="admin-badge">Admin</span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-update-section">
        <h3>Update Profile Image</h3>
        <form onSubmit={handleUpdateProfileImage}>
          <div className="form-group">
            <label htmlFor="profileImageUrl" className="form-label">Profile Image URL:</label>
            <input
              type="url"
              id="profileImageUrl"
              className="form-input"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              required
            />
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}
          {success && <div className="form-success" role="status">{success}</div>}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isUpdating}
            aria-busy={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Image'}
          </button>
        </form>
      </div>

      <div className="profile-actions">
        <button 
          onClick={handleLogout} 
          className="btn-danger"
          aria-label="Logout from your account"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
