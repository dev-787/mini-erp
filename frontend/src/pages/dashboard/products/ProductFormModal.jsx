import React, { useState, useEffect } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import { createProduct, updateProduct } from '../../../api/product.api';
import './products.css';

const ProductFormModal = ({ isOpen, onClose, productToEdit, onSuccess }) => {
  const isEditMode = Boolean(productToEdit);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit_price: '',
    current_stock: '0',
    min_stock_alert: '10',
    location: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        category: productToEdit.category || '',
        unit_price: productToEdit.unit_price !== undefined ? String(productToEdit.unit_price) : '',
        current_stock: String(productToEdit.current_stock || 0),
        min_stock_alert: String(productToEdit.min_stock_alert || 0),
        location: productToEdit.location || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        category: 'Hardware',
        unit_price: '',
        current_stock: '0',
        min_stock_alert: '10',
        location: '',
      });
    }
    setFieldErrors({});
    setGeneralError('');
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sku' ? value.toUpperCase() : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateClientSide = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Product name is required (min 2 chars).';
    }
    if (!formData.sku || formData.sku.trim().length === 0) {
      errors.sku = 'SKU code is required.';
    } else if (!/^[a-zA-Z0-9\-]+$/.test(formData.sku.trim())) {
      errors.sku = 'SKU code can only contain letters, numbers, and hyphens.';
    }
    if (formData.unit_price === '' || isNaN(Number(formData.unit_price)) || Number(formData.unit_price) < 0) {
      errors.unit_price = 'Valid non-negative unit price is required.';
    }
    if (formData.min_stock_alert === '' || isNaN(Number(formData.min_stock_alert)) || Number(formData.min_stock_alert) < 0) {
      errors.min_stock_alert = 'Valid minimum stock alert threshold is required.';
    }
    if (!isEditMode && (formData.current_stock === '' || isNaN(Number(formData.current_stock)) || Number(formData.current_stock) < 0)) {
      errors.current_stock = 'Opening stock must be a non-negative number.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    const clientErrors = validateClientSide();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        const payload = {
          name: formData.name,
          category: formData.category,
          unit_price: parseFloat(formData.unit_price),
          min_stock_alert: parseInt(formData.min_stock_alert),
          location: formData.location,
        };
        const res = await updateProduct(productToEdit.id, payload);
        onSuccess(res.product || res);
      } else {
        const payload = {
          name: formData.name,
          sku: formData.sku.trim().toUpperCase(),
          category: formData.category,
          unit_price: parseFloat(formData.unit_price),
          current_stock: parseInt(formData.current_stock) || 0,
          min_stock_alert: parseInt(formData.min_stock_alert) || 0,
          location: formData.location,
        };
        const res = await createProduct(payload);
        onSuccess(res.product || res);
      }
      onClose();
    } catch (err) {
      console.error('Product form submit error:', err);
      if (err.data && err.data.fields) {
        setFieldErrors(err.data.fields);
      } else {
        setGeneralError(err.message || 'Failed to save product. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="crm-modal-header">
          <h2 className="crm-modal-title">
            {isEditMode ? 'Edit Product Specification' : 'Add New Product to Catalog'}
          </h2>
          <button type="button" className="crm-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="crm-form">
          {generalError && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #FECACA',
            }}>
              {generalError}
            </div>
          )}

          <div className="crm-form-grid">
            {/* Product Name */}
            <div className="crm-form-group full-width">
              <label className="crm-label">
                Product Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Industrial Steel Wire 5mm"
                className={`crm-input ${fieldErrors.name ? 'error' : ''}`}
                required
              />
              {fieldErrors.name && <span className="crm-field-error">{fieldErrors.name}</span>}
            </div>

            {/* SKU Code */}
            <div className="crm-form-group">
              <label className="crm-label">
                SKU Code <span className="required">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="e.g. SKU-ST-500"
                disabled={isEditMode} // SKU is immutable on edit
                className={`crm-input ${fieldErrors.sku ? 'error' : ''}`}
                required
              />
              {fieldErrors.sku && <span className="crm-field-error">{fieldErrors.sku}</span>}
            </div>

            {/* Category */}
            <div className="crm-form-group">
              <label className="crm-label">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. Raw Materials, Hardware"
                className={`crm-input ${fieldErrors.category ? 'error' : ''}`}
              />
            </div>

            {/* Unit Price */}
            <div className="crm-form-group">
              <label className="crm-label">
                Unit Price (₹) <span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                placeholder="0.00"
                className={`crm-input ${fieldErrors.unit_price ? 'error' : ''}`}
                required
              />
              {fieldErrors.unit_price && <span className="crm-field-error">{fieldErrors.unit_price}</span>}
            </div>

            {/* Minimum Stock Alert Threshold */}
            <div className="crm-form-group">
              <label className="crm-label">
                Min Stock Alert Level <span className="required">*</span>
              </label>
              <input
                type="number"
                min="0"
                name="min_stock_alert"
                value={formData.min_stock_alert}
                onChange={handleChange}
                placeholder="10"
                className={`crm-input ${fieldErrors.min_stock_alert ? 'error' : ''}`}
                required
              />
              {fieldErrors.min_stock_alert && <span className="crm-field-error">{fieldErrors.min_stock_alert}</span>}
            </div>

            {/* Opening Stock (Create mode only!) */}
            {!isEditMode ? (
              <div className="crm-form-group">
                <label className="crm-label">Opening Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  placeholder="0"
                  className={`crm-input ${fieldErrors.current_stock ? 'error' : ''}`}
                />
                {fieldErrors.current_stock && <span className="crm-field-error">{fieldErrors.current_stock}</span>}
              </div>
            ) : (
              <div className="crm-form-group full-width">
                <label className="crm-label">Current Stock</label>
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Info size={16} style={{ color: '#FF540E', flexShrink: 0 }} />
                  <span>
                    Current stock is <strong>{productToEdit.current_stock} units</strong>. Stock cannot be edited directly; use the <strong>Stock Movement Panel</strong> on the detail page to log IN/OUT changes.
                  </span>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="crm-form-group full-width">
              <label className="crm-label">Storage Location / Rack</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Rack A-12, Godown 1"
                className={`crm-input ${fieldErrors.location ? 'error' : ''}`}
              />
            </div>
          </div>

          {/* Modal Footer */}
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
              disabled={submitting}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              <span>{isEditMode ? 'Save Specification' : 'Add to Catalog'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
