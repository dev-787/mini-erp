import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import AdminAuthManager from '../../components/admin/AdminAuthManager';
import './PlaceholderPage.css';

const UsersPage = () => {
  const { user } = useAuthStore();
  const [showManagerModal, setShowManagerModal] = useState(false);

  return (
    <div>
      <div className="placeholder-page-card">
        <div className="placeholder-page-header">
          <div className="placeholder-page-icon-badge">
            <UserPlus size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="placeholder-page-title">Users & Invites</h1>
            <p className="placeholder-page-subtitle">
              Manage system users, send invitation links, and control active sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowManagerModal(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#FF540E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Open Invites & Sessions Control
          </button>
        </div>

        <div className="placeholder-status-banner">
          <span className="placeholder-status-pill">Admin Access</span>
          <span>User management & invitation controls are active. Full RBAC user matrix coming soon.</span>
        </div>
      </div>

      {showManagerModal && user && (
        <AdminAuthManager user={user} onClose={() => setShowManagerModal(false)} />
      )}
    </div>
  );
};

export default UsersPage;
