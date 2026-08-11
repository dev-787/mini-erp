import React, { useState, useEffect } from 'react';
import { X, Loader2, ArrowDownRight, ArrowUpRight, Send } from 'lucide-react';
import { fetchProducts, addStockMovement } from '../../../api/product.api';
import '../products/products.css';

const QuickLogMovementModal = ({ isOpen, onClose, initialProductId, onSuccess }) => {
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMovementType('IN');
      setQuantity('');
      setReason('');
      setInlineError('');

      // Fetch products for selection
      const loadProducts = async () => {
        setLoadingProducts(true);
        try {
          const res = await fetchProducts({ limit: 100 });
          const prods = res.data || [];
          setProductsList(prods);

          if (initialProductId) {
            setSelectedProductId(initialProductId);
          } else if (prods.length > 0) {
            setSelectedProductId(prods[0].id);
          }
        } catch (err) {
          console.error('Failed to load products list for quick log:', err);
        } finally {
          setLoadingProducts(false);
        }
      };
      loadProducts();
    }
  }, [isOpen, initialProductId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');

    if (!selectedProductId) {
      setInlineError('Please select a product.');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setInlineError('Quantity must be a positive number greater than zero.');
      return;
    }

    if (!reason || reason.trim().length === 0) {
      setInlineError('Reason for stock movement is required.');
      return;
    }

    setSubmitting(true);

    try {
      await addStockMovement(selectedProductId, {
        quantity: qty,
        movement_type: movementType,
        reason: reason.trim(),
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Quick log movement error:', err);
      if (err.status === 409 || err.message?.includes('Insufficient stock')) {
        setInlineError(err.data?.message || err.message || 'Insufficient stock to perform OUT movement.');
      } else if (err.data && err.data.fields) {
        const firstErr = Object.values(err.data.fields)[0];
        setInlineError(String(firstErr));
      } else {
        setInlineError(err.message || 'Failed to record stock movement.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProductObj = productsList.find((p) => p.id === selectedProductId);

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="crm-modal-header">
          <h2 className="crm-modal-title">Log Stock Movement (IN / OUT)</h2>
          <button type="button" className="crm-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="crm-form">
          {inlineError && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              {inlineError}
            </div>
          )}

          {/* Movement Type Radio / Toggle */}
          <div className="movement-type-toggle">
            <button
              type="button"
              className={`movement-type-btn in ${movementType === 'IN' ? 'active' : ''}`}
              onClick={() => setMovementType('IN')}
            >
              <ArrowDownRight size={18} /> Stock IN (Restock / Purchase)
            </button>
            <button
              type="button"
              className={`movement-type-btn out ${movementType === 'OUT' ? 'active' : ''}`}
              onClick={() => setMovementType('OUT')}
            >
              <ArrowUpRight size={18} /> Stock OUT (Dispatch / Issue)
            </button>
          </div>

          <div className="crm-form-grid">
            {/* Product Select Dropdown */}
            <div className="crm-form-group full-width">
              <label className="crm-label">
                Select Product <span className="required">*</span>
              </label>
              {loadingProducts ? (
                <div style={{ padding: '8px', fontSize: '13px', color: '#64748B' }}>
                  Loading catalog products...
                </div>
              ) : (
                <select
                  className="crm-input"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Current Stock: {p.current_stock} units
                    </option>
                  ))}
                </select>
              )}
              {selectedProductObj && (
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Selected product currently has <strong>{selectedProductObj.current_stock} units</strong> in stock.
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="crm-form-group">
              <label className="crm-label">
                Quantity <span className="required">*</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="crm-input"
                required
              />
            </div>

            {/* Reason */}
            <div className="crm-form-group">
              <label className="crm-label">
                Reason / Reference <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Supplier Restock, Challan #1042"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="crm-input"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="crm-modal-footer">
            <button
              type="button"
              className="crm-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="crm-btn-primary"
              disabled={submitting || loadingProducts}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Record {movementType} Movement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickLogMovementModal;
