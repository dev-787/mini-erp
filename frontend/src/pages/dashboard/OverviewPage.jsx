import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import './PlaceholderPage.css';

const OverviewPage = () => {
  return (
    <div className="placeholder-page-card">
      <div className="placeholder-page-header">
        <div className="placeholder-page-icon-badge">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="placeholder-page-title">Dashboard Overview</h1>
          <p className="placeholder-page-subtitle">
            Executive overview, key metrics, and system activity summary.
          </p>
        </div>
      </div>

      <div className="placeholder-status-banner">
        <span className="placeholder-status-pill">Coming Soon</span>
        <span>Overview statistics, charts, and metric widgets will be added in the next task.</span>
      </div>
    </div>
  );
};

export default OverviewPage;
