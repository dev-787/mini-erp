import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import rapidLogo from '../../assets/rapid-logo.png';
import './auth.css';

const SignupPage = () => {
  const navigate = useNavigate();

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
            <img src={rapidLogo} alt="ERP System" style={{ height: '110px', objectFit: 'contain' }} />
          </div>

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>

        {/* Notice Card */}
        <div className="auth-row" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <Lock size={48} color="#FF540E" />
          </div>

          <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
            Public Signup Disabled
          </h2>

          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
            To prevent unauthorized access to internal ERP & CRM modules, public account registration is disabled. Accounts can only be provisioned by a system <strong>Admin</strong> via invitation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate('/accept-invite')}
              style={{
                padding: '12px 20px',
                background: '#FF540E',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              I Have an Invite Token
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '12px 20px',
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Return to Login Page
            </button>
          </div>

          <div className="grid-h-line" style={{ bottom: 0 }} />
          <div className="grid-plus grid-plus-bl">+</div>
          <div className="grid-plus grid-plus-br">+</div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
