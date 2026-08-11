import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Send, Loader2, MapPin, Tag, DollarSign, History, AlertCircle
} from 'lucide-react';
import { fetchProductById, updateProduct, fetchStockMovements, addStockMovement } from '../../../api/product.api';
import { useAuthStore } from '../../../store/authStore';
import ProductFormModal from './ProductFormModal';
import './products.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const canWrite = userRole === 'admin' || userRole === 'warehouse';

  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Stock Movement Form State
  const [movQuantity, setMovQuantity] = useState('');
  const [movType, setMovType] = useState('IN');
  const [movReason, setMovReason] = useState('');
  const [loggingMovement, setLoggingMovement] = useState(false);
  const [movementError, setMovementError] = useState('');
  const [movementSuccessMsg, setMovementSuccessMsg] = useState('');

  const loadProductData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError('');

    try {
      const [prodData, movData] = await Promise.all([
        fetchProductById(id),
        fetchStockMovements(id, 1, 30),
      ]);
      setProduct(prodData);
      setMovements(movData.data || []);
      setTotalMovements(movData.total || 0);
    } catch (err) {
      console.error('Product details load error:', err);
      if (err.status === 404) {
        setNotFound(true);
      } else if (err.status === 403) {
        setError('You do not have permission to view product details.');
      } else {
        setError(err.message || 'Failed to load product profile.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // Submit stock movement IN/OUT
  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    setMovementError('');
    setMovementSuccessMsg('');

    const qty = parseInt(movQuantity);
    if (isNaN(qty) || qty <= 0) {
      setMovementError('Quantity must be a positive number greater than 0.');
      return;
    }

    if (!movReason || movReason.trim().length === 0) {
      setMovementError('Please enter a reason for this stock movement.');
      return;
    }

    setLoggingMovement(true);

    try {
      const res = await addStockMovement(id, {
        quantity: qty,
        movement_type: movType,
        reason: movReason.trim(),
      });

      // Update product stock number live
      setProduct(res.product || res);
      // Prepend new movement to timeline
      if (res.movement) {
        setMovements((prev) => [res.movement, ...prev]);
        setTotalMovements((prev) => prev + 1);
      } else {
        loadProductData();
      }

      setMovQuantity('');
      setMovReason('');
      setMovementSuccessMsg(`Successfully logged ${movType} movement of ${qty} units.`);
      setTimeout(() => setMovementSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Stock movement submit error:', err);
      if (err.status === 409 || err.message?.includes('Insufficient stock')) {
        setMovementError(err.data?.message || err.message || 'Insufficient stock to perform OUT movement.');
      } else if (err.data && err.data.fields) {
        const firstErr = Object.values(err.data.fields)[0];
        setMovementError(String(firstErr));
      } else {
        setMovementError(err.message || 'Failed to log stock movement.');
      }
    } finally {
      setLoggingMovement(false);
    }
  };

  const formatRelativeTime = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="prod-container">
        <div className="prod-header-card" style={{ gap: '16px' }}>
          <div className="skeleton-box" style={{ height: '32px', width: '200px' }} />
          <div className="skeleton-box" style={{ height: '40px', width: '100px' }} />
        </div>
        <div className="crm-detail-grid">
          <div className="crm-detail-card">
            <div className="skeleton-box" style={{ height: '24px', width: '100%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '100%' }} />
          </div>
          <div className="timeline-card">
            <div className="skeleton-box" style={{ height: '120px', width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="prod-container">
        <div className="prod-header-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px' }}>
          <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Product Not Found</h2>
          <p style={{ color: '#64748B', margin: '0 0 20px' }}>
            The requested product SKU or ID does not exist in the catalog.
          </p>
          <button type="button" className="crm-btn-primary" onClick={() => navigate('/dashboard/products')}>
            <ArrowLeft size={16} /> Return to Product Catalog
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prod-container">
        <div className="prod-header-card" style={{ padding: '32px', color: '#DC2626' }}>
          <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prod-container">
      {/* Top Header Card */}
      <div className="prod-header-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="crm-btn-secondary"
            style={{ width: 'fit-content', padding: '4px 10px', fontSize: '12px' }}
            onClick={() => navigate('/dashboard/products')}
          >
            <ArrowLeft size={14} /> Back to Products
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="prod-header-title">{product.name}</h1>
            <span className="sku-tag" style={{ fontSize: '13px' }}>
              {product.sku}
            </span>
            {product.category && <span className="type-pill">{product.category}</span>}
          </div>
        </div>

        {canWrite && (
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit3 size={16} /> Edit Product
          </button>
        )}
      </div>

      {/* Low Stock Warning Banner if Applicable */}
      {product.is_low_stock && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#991B1B',
        }}>
          <AlertTriangle size={24} style={{ color: '#DC2626', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>
              Low Stock Warning Alert
            </div>
            <div style={{ fontSize: '13px', color: '#7F1D1D', marginTop: '2px' }}>
              Current stock ({product.current_stock} units) is at or below the minimum alert threshold ({product.min_stock_alert} units). Please log a stock IN movement to replenish inventory.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Details Left, Movement Log & Audit Right */}
      <div className="crm-detail-grid">
        {/* Left Column: Product Specifications & Current Stock Metric */}
        <div className="crm-detail-card">
          {/* Prominent Current Stock Display */}
          <div className="crm-detail-field" style={{
            background: '#F8FAFC',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
          }}>
            <label className="crm-detail-label">Current Stock Level</label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className={`stock-hero-number ${product.is_low_stock ? 'low' : ''}`}>
                {product.current_stock}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>units</span>
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">Unit Selling Price</label>
            <div className="crm-detail-value" style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} style={{ color: '#FF540E' }} />
              ₹{Number(product.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">Min Stock Alert Threshold</label>
            <div className="crm-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={15} style={{ color: '#FF540E' }} />
              {product.min_stock_alert} units
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">Storage Location / Rack</label>
            <div className="crm-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} style={{ color: '#FF540E' }} />
              {product.location || 'Unassigned location'}
            </div>
          </div>
        </div>

        {/* Right Column: Stock Movement Log Form & Audit Trail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Log Stock Movement Panel (Admin & Warehouse Only) */}
          {canWrite && (
            <div className="timeline-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} style={{ color: '#FF540E' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Log Stock Movement (IN / OUT)
                </h2>
              </div>

              {movementSuccessMsg && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {movementSuccessMsg}
                </div>
              )}

              {movementError && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  color: '#B91C1C',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {movementError}
                </div>
              )}

              <form onSubmit={handleMovementSubmit} className="movement-form-box">
                {/* Movement Type Toggle */}
                <div className="movement-type-toggle">
                  <button
                    type="button"
                    className={`movement-type-btn in ${movType === 'IN' ? 'active' : ''}`}
                    onClick={() => setMovType('IN')}
                  >
                    <ArrowDownRight size={18} /> Stock IN (Restock / Purchase)
                  </button>
                  <button
                    type="button"
                    className={`movement-type-btn out ${movType === 'OUT' ? 'active' : ''}`}
                    onClick={() => setMovType('OUT')}
                  >
                    <ArrowUpRight size={18} /> Stock OUT (Dispatch / Issue)
                  </button>
                </div>

                <div className="crm-form-grid" style={{ gap: '12px' }}>
                  <div className="crm-form-group">
                    <label className="crm-label">Quantity <span className="required">*</span></label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={movQuantity}
                      onChange={(e) => setMovQuantity(e.target.value)}
                      className="crm-input"
                      required
                    />
                  </div>

                  <div className="crm-form-group">
                    <label className="crm-label">Reason / Reference <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. PO-8492, Stock Correction"
                      value={movReason}
                      onChange={(e) => setMovReason(e.target.value)}
                      className="crm-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="crm-btn-primary"
                    disabled={loggingMovement}
                  >
                    {loggingMovement ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>Record {movType} Movement</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Movement Audit History List */}
          <div className="timeline-card">
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Stock Movement Audit History ({totalMovements})
            </h2>

            {movements.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                  No stock movements recorded yet.
                </p>
              </div>
            ) : (
              <div className="crm-table-container">
                <table className="crm-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Reason / Reference</th>
                      <th>Logged By</th>
                      <th>Date / Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov) => (
                      <tr key={mov.id}>
                        <td>
                          {mov.movement_type === 'IN' ? (
                            <span className="movement-badge-in">
                              <ArrowDownRight size={13} /> IN
                            </span>
                          ) : (
                            <span className="movement-badge-out">
                              <ArrowUpRight size={13} /> OUT
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '14px' }}>
                          {mov.movement_type === 'IN' ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </td>
                        <td>{mov.reason}</td>
                        <td style={{ fontWeight: 500 }}>{mov.created_by_name || 'System User'}</td>
                        <td style={{ color: '#64748B' }}>{formatRelativeTime(mov.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      <ProductFormModal
        isOpen={isEditModalOpen}
        productToEdit={product}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setIsEditModalOpen(false);
          setProduct(updated);
        }}
      />
    </div>
  );
};

export default ProductDetailPage;
