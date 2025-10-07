import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { uploadProfileImage, deleteProfileImage } from '../services/supabase';
import '../styles/07-pages/profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [nameError, setNameError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!profileImageFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setIsUploadingFile(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', profileImageFile);
      
      // Debug: log the FormData contents
      console.log('Uploading file:', profileImageFile);
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Upload via backend endpoint (let axios set Content-Type automatically)
      const response = await api.post('/upload/profile-image', formData);

      // Update user in context with new profile image
      const updatedUser = { ...user, profile_image_url: response.data.publicUrl };
      updateUser(updatedUser);

      setUploadSuccess('Profile image uploaded successfully!');
      setProfileImageFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('profileImageFile');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Failed to upload image');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setUploadError('File size must be less than 5MB');
        return;
      }

      setUploadError('');
      setProfileImageFile(file);
    }
  };

  const handleEditNameClick = () => {
    setEditNameValue(user.name);
    setIsEditingName(true);
    setNameError('');
    setNameSuccess('');
  };

  const handleCancelNameEdit = () => {
    setIsEditingName(false);
    setEditNameValue('');
    setNameError('');
  };

  const handleSaveNameEdit = async () => {
    if (!editNameValue.trim()) {
      setNameError('Name cannot be empty');
      return;
    }

    setNameError('');
    setNameSuccess('');
    setIsUpdatingName(true);

    try {
      await api.put(`/players/${user.id}`, {
        name: editNameValue.trim()
      });

      // Update user in context with new name
      const updatedUser = { ...user, name: editNameValue.trim() };
      updateUser(updatedUser);

      setNameSuccess('Name updated successfully!');
      setIsEditingName(false);
      setEditNameValue('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err.response?.data?.error || 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveNameEdit();
    } else if (e.key === 'Escape') {
      handleCancelNameEdit();
    }
  };

  if (!user) {
    return (
      <div className="u-flex u-items-center u-justify-center u-p-8">
        <div className="u-text-lg u-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="u-bg-gradient-primary u-p-8" style={{ minHeight: '100vh' }}>
      <div className="u-mx-auto" style={{ maxWidth: '800px' }}>
        <h2 className="u-text-4xl u-text-bold u-text-primary u-mb-8 u-leading-tight">
          My Profile
        </h2>
        
        <div className="card u-mb-8">
          <div className="profile-card-layout">
            <div className="u-flex-shrink-0" aria-label="Profile picture">
              {user.profile_image_url && user.profile_image_url.startsWith('http') ? (
                <img 
                  src={user.profile_image_url} 
                  alt={`${user.name}'s profile picture`}
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                    e.target.alt = 'Default profile placeholder image';
                  }}
                />
              ) : (
                <div className="profile-avatar-placeholder" role="img" aria-label={`${user.name}'s profile initial`}>
                  <span aria-hidden="true" className="u-text-4xl u-text-bold u-text-inverse">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="profile-info u-flex-1 u-flex u-flex-col u-gap-4 u-justify-center">
              <div className="profile-info-row u-flex u-gap-4 u-items-center">
                <span className="profile-info-label u-text-sm u-text-semibold u-text-secondary" style={{ minWidth: '80px' }}>Name:</span>
                {isEditingName ? (
                  <div className="u-flex u-gap-2 u-items-center u-flex-1">
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={handleNameKeyPress}
                      className="form-input u-flex-1"
                      style={{ minHeight: '32px', fontSize: '1.125rem' }}
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveNameEdit}
                      disabled={isUpdatingName}
                      className="btn-link u-text-sm"
                    >
                      {isUpdatingName ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelNameEdit}
                      className="btn-link u-text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="u-flex u-gap-2 u-items-center u-flex-1">
                    <span className="profile-info-value u-text-lg u-text-primary">{user.name}</span>
                    <button 
                      onClick={handleEditNameClick}
                      className="btn-link u-text-sm"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              {nameError && <div className="form-error u-text-sm" role="alert">{nameError}</div>}
              {nameSuccess && <div className="form-success u-text-sm" role="status">{nameSuccess}</div>}
              <div className="profile-info-row u-flex u-gap-4 u-items-center">
                <span className="profile-info-label u-text-sm u-text-semibold u-text-secondary" style={{ minWidth: '80px' }}>Email:</span>
                <span className="profile-info-value u-text-lg u-text-primary">{user.email}</span>
              </div>
              {user.is_admin && (
                <div className="profile-info-row u-flex u-gap-4 u-items-center">
                  <span className="profile-info-label u-text-sm u-text-semibold u-text-secondary" style={{ minWidth: '80px' }}>Role:</span>
                  <span className="admin-badge">Admin</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card u-mb-8">
          <div className="card-header">
            <h3 className="card-header-title">Upload Profile Image</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleFileUpload} style={{ maxWidth: '500px' }}>
              <div className="form-group">
                <label htmlFor="profileImageFile" className="form-label">Choose Image File:</label>
                <input
                  type="file"
                  id="profileImageFile"
                  className="form-input"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  required
                />
                <small className="form-help">
                  Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
                </small>
              </div>

              {profileImageFile && (
                <div className="form-group">
                  <p className="u-text-sm u-text-secondary">
                    Selected: {profileImageFile.name} ({Math.round(profileImageFile.size / 1024)}KB)
                  </p>
                </div>
              )}

              {uploadError && <div className="form-error" role="alert">{uploadError}</div>}
              {uploadSuccess && <div className="form-success" role="status">{uploadSuccess}</div>}

              <button 
                type="submit" 
                className="btn-primary"
                disabled={isUploadingFile || !profileImageFile}
                aria-busy={isUploadingFile}
              >
                {isUploadingFile ? 'Uploading...' : 'Upload Image'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <button 
              onClick={handleLogout} 
              className="btn-link"
              aria-label="Logout from your account"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
