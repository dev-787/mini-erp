import React from 'react';
import { Layers } from 'lucide-react';
import './PlaceholderPage.css';

const InventoryPage = () => {
  return (
    <div className="placeholder-page-card">
      <div className="placeholder-page-header">
        <div className="placeholder-page-icon-badge">
          <Layers size={24} />
        </div>
        <div>
          <h1 className="placeholder-page-title">Inventory / Stock</h1>
          <p className="placeholder-page-subtitle">
            Stock levels, warehouse movements, and low-stock alerts.
          </p>
        </div>
      </div>

      <div className="placeholder-status-banner">
        <span className="placeholder-status-pill">Coming Soon</span>
        <span>Stock tracking and inventory movement features are under development.</span>
      </div>
    </div>
  );
};

export default InventoryPage;
