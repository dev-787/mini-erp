import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getInviteByToken, acceptInvite } from '../../api/auth.api';
import rapidLogo from '../../assets/rapid-logo.png';
import './auth.css';

const AcceptInvitePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  const [tokenInput, setTokenInput] = useState(searchParams.get('token') || '');
  const [inviteDetails, setInviteDetails] = useState(null);
  const [validating, setValidating] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      validateToken(urlToken);
    }
  }, [searchParams]);

  const validateToken = async (tokenToVerify) => {
    if (!tokenToVerify.trim()) return;
    setValidating(true);
    setTokenError('');
    setInviteDetails(null);

    try {
      const data = await getInviteByToken(tokenToVerify.trim());
      setInviteDetails(data);
    } catch (err) {
      setTokenError(err.message || 'Invite token is invalid or has expired.');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmitInvite = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const tokenToUse = tokenInput.trim();
    if (!tokenToUse) {
      setSubmitError('Invite token is required.');
      return;
    }

    if (!name.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await acceptInvite({
        token: tokenToUse,
        name: name.trim(),
        password,
      });

      setAuth(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="grid-v-line grid-v-line-left" />
      <div className="grid-v-line grid-v-line-right" />

      <div className="auth-center-column">
        {/* Logo */}
        <div className="auth-row" style={{ padding: '16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="grid-h-line" style={{ top: 0 }} />
          <div className="grid-plus grid-plus-tl">+</div>
          <div className="grid-plus grid-plus-tr">+</div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={rapidLogo} alt="ERP System" style={{ height: '100px', objectFit: 'contain' }} />
          </div>

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Title */}
        <div className="auth-row" style={{ padding: '20px 40px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
            Accept Invitation & Setup Account
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748B' }}>
            Complete your onboarding for the ERP system
          </p>
          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Form Body */}
        <div className="auth-row" style={{ padding: '32px 40px' }}>
          {!inviteDetails && (
            <div style={{ marginBottom: '24px' }}>
              <label className="auth-label">Invite Token or Code</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Paste raw token here..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => validateToken(tokenInput)}
                  disabled={validating || !tokenInput.trim()}
                  style={{
                    padding: '0 16px',
                    background: '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {validating ? 'Verifying...' : 'Verify Token'}
                </button>
              </div>

              {tokenError && (
                <div style={{ color: '#EF4444', fontSize: '13px', marginTop: '8px' }}>
                  ⚠️ {tokenError}
                </div>
              )}
            </div>
          )}

          {inviteDetails && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '24px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Verified Invite Details
              </div>
              <div style={{ fontSize: '14px', color: '#1E293B', marginBottom: '4px' }}>
                <strong>Email:</strong> {inviteDetails.email}
              </div>
              <div style={{ fontSize: '14px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong>Assigned Role:</strong>
                <span style={{
                  background: '#3B82F6',
                  color: '#FFF',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}>
                  {inviteDetails.role}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  (Role fixed by Admin)
                </span>
              </div>
            </div>
          )}

          {inviteDetails && (
            <form onSubmit={handleSubmitInvite}>
              {submitError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  color: '#EF4444',
                }}>
                  ⚠️ {submitError}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="auth-label">Set Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="auth-label">Confirm Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#10B981',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Creating Account...' : 'Complete Setup & Log In'}
              </button>
            </form>
          )}

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        <div className="auth-row" style={{ padding: '18px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Already set up your password?{' '}
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
              style={{ color: '#FF540E', fontWeight: '600', textDecoration: 'none' }}
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
