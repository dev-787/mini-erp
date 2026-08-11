import React from 'react';
import { Users } from 'lucide-react';
import './PlaceholderPage.css';

const CustomersPage = () => {
  return (
    <div className="placeholder-page-card">
      <div className="placeholder-page-header">
        <div className="placeholder-page-icon-badge">
          <Users size={24} />
        </div>
        <div>
          <h1 className="placeholder-page-title">Customers</h1>
          <p className="placeholder-page-subtitle">
            Customer relationship management, lead tracking, and contact directory.
          </p>
        </div>
      </div>

      <div className="placeholder-status-banner">
        <span className="placeholder-status-pill">Coming Soon</span>
        <span>Customer directory and management features are under development.</span>
      </div>
    </div>
  );
};

export default CustomersPage;
