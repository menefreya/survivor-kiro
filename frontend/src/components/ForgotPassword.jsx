import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/07-pages/auth.css';
import '../styles/06-features/hero-section.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
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
            <h2>Forgot Password</h2>

            {submitted ? (
              <div>
                <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  If that email is registered, you'll receive a reset link shortly. Check your inbox (and spam folder).
                </p>
                <div className="auth-footer">
                  <Link to="/login">Back to Login</Link>
                </div>
              </div>
            ) : (
              <>
                <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem', opacity: 0.85 }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleSubmit} className="auth-form" aria-label="Forgot password form">
                  <div className="form-group">
                    <label htmlFor="email" className="required">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      aria-required="true"
                      autoComplete="email"
                    />
                  </div>

                  {error && <div className="api-error-message" role="alert">{error}</div>}

                  <button
                    type="submit"
                    className={`auth-button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
