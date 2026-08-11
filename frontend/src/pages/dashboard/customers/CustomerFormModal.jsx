import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createCustomer, updateCustomer } from '../../../api/customer.api';
import './customers.css';

const CustomerFormModal = ({ isOpen, onClose, customerToEdit, onSuccess }) => {
  const isEditMode = Boolean(customerToEdit);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    business_name: '',
    gst_number: '',
    customer_type: 'Wholesale',
    address: '',
    status: 'Lead',
    follow_up_date: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        mobile: customerToEdit.mobile || '',
        email: customerToEdit.email || '',
        business_name: customerToEdit.business_name || '',
        gst_number: customerToEdit.gst_number || '',
        customer_type: customerToEdit.customer_type || 'Wholesale',
        address: customerToEdit.address || '',
        status: customerToEdit.status || 'Lead',
        follow_up_date: customerToEdit.follow_up_date
          ? new Date(customerToEdit.follow_up_date).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData({
        name: '',
        mobile: '',
        email: '',
        business_name: '',
        gst_number: '',
        customer_type: 'Wholesale',
        address: '',
        status: 'Lead',
        follow_up_date: '',
      });
    }
    setFieldErrors({});
    setGeneralError('');
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateClientSide = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Customer name is required (min 2 chars).';
    }
    if (!formData.mobile || formData.mobile.trim().length < 10) {
      errors.mobile = 'Valid 10-15 digit mobile number is required.';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid email address format.';
    }
    if (formData.gst_number && formData.gst_number.trim().length > 0) {
      const cleanGst = formData.gst_number.trim().toUpperCase();
      if (cleanGst.length !== 15) {
        errors.gst_number = 'GST number must be exactly 15 characters.';
      }
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
        const res = await updateCustomer(customerToEdit.id, formData);
        onSuccess(res.customer || res);
      } else {
        const payload = { ...formData };
        delete payload.status; // Status defaults to Lead on creation
        const res = await createCustomer(payload);
        onSuccess(res.customer || res);
      }
      onClose();
    } catch (err) {
      console.error('Customer form submit error:', err);
      if (err.data && err.data.fields) {
        setFieldErrors(err.data.fields);
      } else {
        setGeneralError(err.message || 'Failed to save customer. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="crm-modal-header">
          <h2 className="crm-modal-title">
            {isEditMode ? 'Edit Customer Details' : 'Add New Customer'}
          </h2>
          <button type="button" className="crm-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
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
            {/* Customer Name */}
            <div className="crm-form-group">
              <label className="crm-label">
                Customer Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Kumar"
                className={`crm-input ${fieldErrors.name ? 'error' : ''}`}
                required
              />
              {fieldErrors.name && <span className="crm-field-error">{fieldErrors.name}</span>}
            </div>

            {/* Mobile Number */}
            <div className="crm-form-group">
              <label className="crm-label">
                Mobile Number <span className="required">*</span>
              </label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="e.g. +919876543210"
                className={`crm-input ${fieldErrors.mobile ? 'error' : ''}`}
                required
              />
              {fieldErrors.mobile && <span className="crm-field-error">{fieldErrors.mobile}</span>}
            </div>

            {/* Business Name */}
            <div className="crm-form-group">
              <label className="crm-label">Business / Firm Name</label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                placeholder="e.g. Apex Wholesale Traders"
                className={`crm-input ${fieldErrors.business_name ? 'error' : ''}`}
              />
              {fieldErrors.business_name && <span className="crm-field-error">{fieldErrors.business_name}</span>}
            </div>

            {/* Email */}
            <div className="crm-form-group">
              <label className="crm-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rajesh@apextraders.com"
                className={`crm-input ${fieldErrors.email ? 'error' : ''}`}
              />
              {fieldErrors.email && <span className="crm-field-error">{fieldErrors.email}</span>}
            </div>

            {/* Customer Type */}
            <div className="crm-form-group">
              <label className="crm-label">
                Customer Type <span className="required">*</span>
              </label>
              <select
                name="customer_type"
                value={formData.customer_type}
                onChange={handleChange}
                className={`crm-select ${fieldErrors.customer_type ? 'error' : ''}`}
              >
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
                <option value="Retail">Retail</option>
              </select>
              {fieldErrors.customer_type && <span className="crm-field-error">{fieldErrors.customer_type}</span>}
            </div>

            {/* GST Number */}
            <div className="crm-form-group">
              <label className="crm-label">GSTIN (Optional)</label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleChange}
                placeholder="e.g. 27AABCU9603R1ZM"
                maxLength={15}
                className={`crm-input ${fieldErrors.gst_number ? 'error' : ''}`}
              />
              {fieldErrors.gst_number && <span className="crm-field-error">{fieldErrors.gst_number}</span>}
            </div>

            {/* Status (Only available in Edit Mode) */}
            {isEditMode && (
              <div className="crm-form-group">
                <label className="crm-label">Customer Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="crm-select"
                >
                  <option value="Lead">Lead</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            {/* Follow-up Date */}
            <div className="crm-form-group">
              <label className="crm-label">Follow-up Date</label>
              <input
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleChange}
                className={`crm-input ${fieldErrors.follow_up_date ? 'error' : ''}`}
              />
              {fieldErrors.follow_up_date && <span className="crm-field-error">{fieldErrors.follow_up_date}</span>}
            </div>

            {/* Address */}
            <div className="crm-form-group full-width">
              <label className="crm-label">Address</label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete office/godown address..."
                className={`crm-textarea ${fieldErrors.address ? 'error' : ''}`}
              />
              {fieldErrors.address && <span className="crm-field-error">{fieldErrors.address}</span>}
            </div>
          </div>

          {/* Footer Actions */}
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
              <span>{isEditMode ? 'Save Changes' : 'Create Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
