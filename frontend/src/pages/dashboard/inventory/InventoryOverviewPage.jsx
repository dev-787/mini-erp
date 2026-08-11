import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { fetchLowStockProducts } from '../../../api/product.api';
import '../products/products.css';

const InventoryOverviewPage = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchLowStockProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error('Fetch low stock inventory error:', err);
      if (err.status === 403) {
        setError('You do not have permission to view inventory alerts.');
      } else {
        setError(err.message || 'Failed to load low stock inventory report.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="prod-container">
      {/* Top Header Card */}
      <div className="prod-header-card">
        <div>
          <h1 className="prod-header-title">Low Stock Inventory Monitor</h1>
          <p className="prod-header-subtitle">
            Cross-product emergency restock report — products requiring immediate replenishment.
          </p>
        </div>

        <button
          type="button"
          className="crm-btn-secondary"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Report</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="crm-table-card">
        {error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#DC2626' }}>
            <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>{error}</p>
          </div>
        ) : loading ? (
          <div style={{ padding: '32px' }}>
            <div className="skeleton-box" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ height: '40px', width: '100%' }} />
          </div>
        ) : products.length === 0 ? (
          // Empty State: All Products Sufficiently Stocked
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              All Products Are Sufficiently Stocked!
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px', maxWidth: '480px', marginInline: 'auto' }}>
              No products are currently at or below their minimum stock alert threshold. All warehouse stock levels are healthy.
            </p>
            <button
              type="button"
              className="crm-btn-primary"
              onClick={() => navigate('/dashboard/products')}
            >
              View Full Product Catalog <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          // Low Stock Alert Table
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min Alert Threshold</th>
                  <th>Deficit Shortage</th>
                  <th>Storage Location</th>
                  <th style={{ textAlign: 'right' }}>Restock Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const shortage = Math.max(0, prod.min_stock_alert - prod.current_stock);
                  return (
                    <tr
                      key={prod.id}
                      onClick={() => navigate(`/dashboard/products/${prod.id}`)}
                    >
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {prod.name}
                      </td>
                      <td>
                        <span className="sku-tag">{prod.sku}</span>
                      </td>
                      <td>{prod.category || '—'}</td>
                      <td>
                        <span className="stock-hero-number low" style={{ fontSize: '16px' }}>
                          {prod.current_stock}
                        </span>{' '}
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>units</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#475569' }}>
                        {prod.min_stock_alert} units
                      </td>
                      <td>
                        <span className="low-stock-badge">
                          <AlertTriangle size={13} /> -{shortage} units deficit
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569' }}>
                        {prod.location || 'Unassigned'}
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="crm-btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => navigate(`/dashboard/products/${prod.id}`)}
                        >
                          Log Restock <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryOverviewPage;
