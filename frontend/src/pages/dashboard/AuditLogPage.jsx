import React from 'react';
import { History } from 'lucide-react';
import './PlaceholderPage.css';

const AuditLogPage = () => {
  return (
    <div className="placeholder-page-card">
      <div className="placeholder-page-header">
        <div className="placeholder-page-icon-badge">
          <History size={24} />
        </div>
        <div>
          <h1 className="placeholder-page-title">Audit Log</h1>
          <p className="placeholder-page-subtitle">
            System audit trail, security events, and user activity records.
          </p>
        </div>
      </div>

      <div className="placeholder-status-banner">
        <span className="placeholder-status-pill">Coming Soon</span>
        <span>Audit log recording and security event tracking features are under development.</span>
      </div>
    </div>
  );
};

export default AuditLogPage;
