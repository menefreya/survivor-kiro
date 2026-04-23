import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../styles/07-pages/profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleUpdateProfileImage = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await api.post(`/players/${user.id}/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedUser = { ...user, profile_image_url: response.data.player.profile_image_url };
      updateUser(updatedUser);

      setSuccess('Profile image updated successfully!');
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload profile image');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameError('');
    setIsUpdatingName(true);

    try {
      await api.put(`/players/${user.id}`, {
        name: name
      });

      // Update user in context with new name
      const updatedUser = { ...user, name: name };
      updateUser(updatedUser);

      setIsEditingName(false);
    } catch (err) {
      setNameError(err.response?.data?.error || 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleEditName = () => {
    setName(user.name);
    setIsEditingName(true);
    setNameError('');
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setName('');
    setNameError('');
  };

  if (!user) {
    return <div className="profile-container">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <h2 className="profile-container__title">My Profile</h2>
      
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
            {!isEditingName ? (
              <>
                <span>{user.name}</span>
                <button onClick={handleEditName} className="btn-edit" aria-label="Edit name">
                  Edit
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateName} className="inline-edit-form">
                <input
                  type="text"
                  className="form-input-inline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isUpdatingName}
                  aria-label="Save name"
                >
                  {isUpdatingName ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-cancel"
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
          {nameError && <div className="form-error" role="alert">{nameError}</div>}
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
        <h3 className="profile-container__subtitle">Update Profile Image</h3>
        <form onSubmit={handleUpdateProfileImage}>
          <div className="form-group">
            <label htmlFor="profileImageFile" className="form-label">Choose an image:</label>
            <input
              type="file"
              id="profileImageFile"
              className="form-input"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
            />
          </div>

          {previewUrl && (
            <div className="profile-image-preview">
              <img src={previewUrl} alt="Preview of selected profile" className="profile-image" />
            </div>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}
          {success && <div className="form-success" role="status">{success}</div>}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={isUpdating || !selectedFile}
            aria-busy={isUpdating}
          >
            {isUpdating ? 'Uploading...' : 'Upload Image'}
          </button>
        </form>
      </div>

      <div className="profile-actions">
        <button 
          onClick={handleLogout} 
          className="btn btn--danger"
          aria-label="Logout from your account"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
