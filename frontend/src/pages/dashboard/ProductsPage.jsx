import React from 'react';
import { Package } from 'lucide-react';
import './PlaceholderPage.css';

const ProductsPage = () => {
  return (
    <div className="placeholder-page-card">
      <div className="placeholder-page-header">
        <div className="placeholder-page-icon-badge">
          <Package size={24} />
        </div>
        <div>
          <h1 className="placeholder-page-title">Products</h1>
          <p className="placeholder-page-subtitle">
            Product catalog, pricing tiers, and SKU definitions.
          </p>
        </div>
      </div>

      <div className="placeholder-status-banner">
        <span className="placeholder-status-pill">Coming Soon</span>
        <span>Product catalog and SKU management features are under development.</span>
      </div>
    </div>
  );
};

export default ProductsPage;
