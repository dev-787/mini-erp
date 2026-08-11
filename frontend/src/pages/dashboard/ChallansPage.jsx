import React from 'react';
import { FileText } from 'lucide-react';
import './PlaceholderPage.css';

const ChallansPage = () => {
  return (
    <div className="placeholder-page-card">
      <div className="placeholder-page-header">
        <div className="placeholder-page-icon-badge">
          <FileText size={24} />
        </div>
        <div>
          <h1 className="placeholder-page-title">Sales Challans</h1>
          <p className="placeholder-page-subtitle">
            Sales dispatch notes, draft challans, and stock deductions.
          </p>
        </div>
      </div>

      <div className="placeholder-status-banner">
        <span className="placeholder-status-pill">Coming Soon</span>
        <span>Sales challan creation and dispatch tracking are under development.</span>
      </div>
    </div>
  );
};

export default ChallansPage;
