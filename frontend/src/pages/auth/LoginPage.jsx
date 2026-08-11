import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Zap, UserCheck, Briefcase, Package, BarChart3, AlertTriangle, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../api/auth.api';
import rapidLogo from '../../assets/rapid-logo.png';
import './auth.css';

const ROLE_HOME = {
  admin: '/dashboard',
  sales: '/sales',
  warehouse: '/warehouse',
  accounts: '/accounts',
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth, user, checkAuth, initialized } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialized) {
      checkAuth();
    }
  }, [initialized, checkAuth]);

  if (user) {
    const rolePath = ROLE_HOME[user.role.toLowerCase()] || '/dashboard';
    return <Navigate to={rolePath} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password });
      setAuth(data.user);
      const targetPath = ROLE_HOME[data.user.role.toLowerCase()] || '/dashboard';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="auth-page-container">
      <div className="grid-v-line grid-v-line-left" />
      <div className="grid-v-line grid-v-line-right" />

      <div className="auth-center-column">
        {/* Header Logo */}
        <div className="auth-row" style={{ padding: '16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="grid-h-line" style={{ top: 0 }} />
          <div className="grid-plus grid-plus-tl">+</div>
          <div className="grid-plus grid-plus-tr">+</div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={rapidLogo} alt="ERP System" style={{ height: '110px', objectFit: 'contain' }} />
          </div>

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Title */}
        <div className="auth-row" style={{ padding: '20px 40px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>ERP System Login</h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748B' }}>
            Internal Wholesale & Distribution System
          </p>
          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Login Form */}
        <div className="auth-row" style={{ padding: '32px 40px' }}>
          {error && (
            <div className="animate-shake" style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} id="auth-form">
            <div style={{ marginBottom: '18px' }}>
              <label className="auth-label">Email Address</label>
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label className="auth-label">Password</label>
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              className="auth-button-submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#FF540E',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Demo Credentials Section */}
        <div className="auth-row" style={{ padding: '20px 40px', background: '#F8FAFC' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#FF540E" /> Demo Accounts (Click to Autofill)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@example.com', 'Admin@123')}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                textAlign: 'left',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                background: '#FFF',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Shield size={13} color="#991B1B" /> <strong>Admin</strong></span><br/>
              <span style={{ color: '#64748B' }}>admin@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('sales@example.com', 'Sales@123')}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                textAlign: 'left',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                background: '#FFF',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Briefcase size={13} color="#1E40AF" /> <strong>Sales</strong></span><br/>
              <span style={{ color: '#64748B' }}>sales@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('warehouse@example.com', 'Warehouse@123')}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                textAlign: 'left',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                background: '#FFF',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Package size={13} color="#92400E" /> <strong>Warehouse</strong></span><br/>
              <span style={{ color: '#64748B' }}>warehouse@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('accounts@example.com', 'Accounts@123')}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                textAlign: 'left',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                background: '#FFF',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BarChart3 size={13} color="#065F46" /> <strong>Accounts</strong></span><br/>
              <span style={{ color: '#64748B' }}>accounts@example.com</span>
            </button>
          </div>

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Invite Only Notice */}
        <div className="auth-row" style={{ padding: '20px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Lock size={14} /> Public signup is disabled. Have an invitation link?{' '}
            <a
              href="/accept-invite"
              onClick={(e) => {
                e.preventDefault();
                navigate('/accept-invite');
              }}
              style={{
                color: '#FF540E',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Accept Invite
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
