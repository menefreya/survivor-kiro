import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/07-pages/auth.css';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    profileImageUrl: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        name: formData.name
      };

      // Only include profile_image_url if provided
      if (formData.profileImageUrl) {
        payload.profile_image_url = formData.profileImageUrl;
      }

      await api.post('/auth/signup', payload);
      
      // Redirect to login page after successful signup
      navigate('/login');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error) {
        // Handle duplicate email or validation errors
        setApiError(error.response.data.error);
      } else {
        setApiError('An error occurred during signup. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} className="auth-form" aria-label="Sign up form">
        <div className="form-group">
          <label htmlFor="name" className="required">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter your full name"
            required
            aria-required="true"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
            autoComplete="name"
          />
          {errors.name && <span id="name-error" className="error-message" role="alert">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="required">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="your.email@example.com"
            required
            aria-required="true"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoComplete="email"
          />
          {errors.email && <span id="email-error" className="error-message" role="alert">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="required">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            placeholder="Minimum 8 characters"
            required
            aria-required="true"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            autoComplete="new-password"
          />
          {errors.password && <span id="password-error" className="error-message" role="alert">{errors.password}</span>}
          {!errors.password && <span id="password-hint" className="password-hint">Must be at least 8 characters</span>}
        </div>

        <div className="form-group">
          <label htmlFor="profileImageUrl">Profile Image URL (optional)</label>
          <input
            type="url"
            id="profileImageUrl"
            name="profileImageUrl"
            value={formData.profileImageUrl}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
            aria-describedby="profile-image-hint"
          />
          <span id="profile-image-hint" className="visually-hidden">Enter a valid URL for your profile image</span>
        </div>

        {apiError && <div className="api-error-message" role="alert">{apiError}</div>}

        <button 
          type="submit" 
          className={`auth-button ${isLoading ? 'loading' : ''}`} 
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <div className="auth-footer">
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
};

export default SignUp;
