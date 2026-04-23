import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/07-pages/auth.css';
import '../styles/06-features/hero-section.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    if (formData.password !== formData.confirm) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: formData.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="hero-section hero-section--login">
        <div className="hero-section__background">
          <div className="hero-section__overlay"></div>
        </div>

        <div className="hero-section__content hero-section__content--login">
          <div className="hero-section__text hero-section__text--login">
            <h1 className="hero-section__title">
              <span className="hero-section__title-line">OUTWIT.</span>
              <span className="hero-section__title-line">OUTPLAY.</span>
              <span className="hero-section__title-line">OUTLAST.</span>
            </h1>
            <p className="hero-section__subtitle">
              Join the Ultimate Survivor Fantasy League
            </p>
          </div>

          <div className="auth-container auth-container--hero">
            <h2>Reset Password</h2>

            {!token ? (
              <div>
                <p style={{ marginBottom: '1rem' }}>Invalid reset link. Please request a new one.</p>
                <div className="auth-footer">
                  <Link to="/forgot-password">Request new link</Link>
                </div>
              </div>
            ) : success ? (
              <div>
                <p style={{ marginBottom: '1rem' }}>
                  Password reset successfully. Redirecting you to login...
                </p>
                <div className="auth-footer">
                  <Link to="/login">Go to Login</Link>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="auth-form" aria-label="Reset password form">
                  <div className="form-group">
                    <label htmlFor="password" className="required">New Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm" className="required">Confirm Password</label>
                    <input
                      type="password"
                      id="confirm"
                      name="confirm"
                      value={formData.confirm}
                      onChange={handleChange}
                      placeholder="Re-enter your new password"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                    />
                  </div>

                  {error && <div className="api-error-message" role="alert">{error}</div>}

                  <button
                    type="submit"
                    className={`auth-button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
                <div className="auth-footer">
                  <Link to="/login">Back to Login</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
