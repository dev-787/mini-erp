import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Info, Package, UserCheck } from 'lucide-react';
import { fetchCustomers } from '../../../api/customer.api';
import { fetchProducts } from '../../../api/product.api';
import { createChallan, updateChallan, fetchChallanById } from '../../../api/challan.api';
import './challans.css';

const ChallanFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Fetch active customers and catalog products with fresh stock levels
  useEffect(() => {
    const loadResources = async () => {
      setLoadingInitial(true);
      setFormError('');
      try {
        const [custRes, prodRes] = await Promise.all([
          fetchCustomers({ limit: 100 }),
          fetchProducts({ limit: 100 }),
        ]);

        const custs = custRes.data || [];
        const prods = prodRes.data || [];

        setCustomers(custs);
        setProductsCatalog(prods);

        if (isEditMode) {
          const challan = await fetchChallanById(id);
          if (!challan) {
            setFormError('Challan not found.');
            return;
          }

          if (challan.status !== 'Draft') {
            setFormError('Only Draft sales challans can be edited.');
            return;
          }

          setSelectedCustomerId(challan.customer_id);

          // Map items with fresh stock info from catalog
          const mappedItems = (challan.items || []).map((item) => {
            const liveProd = prods.find((p) => p.id === item.product_id);
            return {
              product_id: item.product_id,
              name: item.product_name_snapshot,
              sku: item.product_sku_snapshot,
              unit_price: item.unit_price_snapshot,
              current_stock: liveProd ? liveProd.current_stock : 0,
              quantity: item.quantity,
            };
          });

          setLineItems(mappedItems);
        }
      } catch (err) {
        console.error('Challan form initialization error:', err);
        setFormError(err.message || 'Failed to initialize form resources.');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadResources();
  }, [id, isEditMode]);

  // Product Selection helper
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');

  const handleAddLineItem = () => {
    if (!selectedProductToAdd) return;

    const prodObj = productsCatalog.find((p) => p.id === selectedProductToAdd);
    if (!prodObj) return;

    // Check if already in lineItems
    const existingIdx = lineItems.findIndex((item) => item.product_id === prodObj.id);
    if (existingIdx !== -1) {
      // Increment quantity
      const updated = [...lineItems];
      updated[existingIdx].quantity += 1;
      setLineItems(updated);
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          product_id: prodObj.id,
          name: prodObj.name,
          sku: prodObj.sku,
          unit_price: Number(prodObj.unit_price),
          current_stock: Number(prodObj.current_stock),
          quantity: 1,
        },
      ]);
    }
    setSelectedProductToAdd('');
  };

  const handleQuantityChange = (productId, newQty) => {
    const qtyInt = parseInt(newQty);
    setLineItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: isNaN(qtyInt) ? '' : Math.max(1, qtyInt) }
          : item
      )
    );
  };

  const handleRemoveLineItem = (productId) => {
    setLineItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Running Totals
  const runningTotalQty = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const runningTotalValue = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!selectedCustomerId) {
      setFieldErrors({ customer_id: 'Please select a customer for this challan.' });
      return;
    }

    if (lineItems.length === 0) {
      setFormError('Please add at least one product item to the sales challan.');
      return;
    }

    const payloadItems = lineItems.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity) || 1,
    }));

    setSubmitting(true);

    try {
      if (isEditMode) {
        const res = await updateChallan(id, {
          customer_id: selectedCustomerId,
          items: payloadItems,
        });
        navigate(`/dashboard/challans/${res.challan?.id || id}`);
      } else {
        const res = await createChallan({
          customer_id: selectedCustomerId,
          items: payloadItems,
        });
        navigate(`/dashboard/challans/${res.challan?.id || res.id}`);
      }
    } catch (err) {
      console.error('Save challan error:', err);
      if (err.data && err.data.fields) {
        setFieldErrors(err.data.fields);
      } else {
        setFormError(err.message || 'Failed to save sales challan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="prod-container">
        <div className="prod-header-card">
          <div className="skeleton-box" style={{ height: '32px', width: '200px' }} />
        </div>
        <div className="crm-table-card" style={{ padding: '32px' }}>
          <div className="skeleton-box" style={{ height: '40px', width: '100%', marginBottom: '16px' }} />
          <div className="skeleton-box" style={{ height: '40px', width: '100%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="prod-container">
      {/* Header Card */}
      <div className="prod-header-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="crm-btn-secondary"
            style={{ width: 'fit-content', padding: '4px 10px', fontSize: '12px' }}
            onClick={() => navigate('/dashboard/challans')}
          >
            <ArrowLeft size={14} /> Back to Challans List
          </button>
          <h1 className="prod-header-title">
            {isEditMode ? 'Edit Draft Sales Challan' : 'Create New Sales Delivery Challan'}
          </h1>
        </div>
      </div>

      {formError && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          color: '#DC2626',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          {formError}
        </div>
      )}

      {/* Main Form Form */}
      <form onSubmit={handleSubmit} className="prod-container">
        {/* Step 1: Customer Selection */}
        <div className="crm-table-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <UserCheck size={20} style={{ color: '#FF540E' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              1. Select Customer
            </h2>
          </div>

          <div className="crm-form-group full-width">
            <label className="crm-label">
              Customer Account <span className="required">*</span>
            </label>
            <select
              className={`crm-input ${fieldErrors.customer_id ? 'error' : ''}`}
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                if (fieldErrors.customer_id) setFieldErrors({});
              }}
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.business_name ? `(${c.business_name})` : ''} — {c.customer_type} ({c.mobile})
                </option>
              ))}
            </select>
            {fieldErrors.customer_id && (
              <span className="crm-field-error">{fieldErrors.customer_id}</span>
            )}
          </div>
        </div>

        {/* Step 2: Line Items Product Picker */}
        <div className="crm-table-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={20} style={{ color: '#FF540E' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                2. Product Line Items ({lineItems.length})
              </h2>
            </div>
          </div>

          {/* Product Add Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '20px',
            backgroundColor: '#F8FAFC',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ flex: 1 }}>
              <select
                className="crm-input"
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
              >
                <option value="">-- Select Product to Add --</option>
                {productsCatalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Live Stock: {p.current_stock} units — ₹{Number(p.unit_price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="crm-btn-primary"
              onClick={handleAddLineItem}
              disabled={!selectedProductToAdd}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Line Items Table */}
          {lineItems.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#64748B',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px dashed #CBD5E1',
            }}>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>
                No product items added yet. Select a product above to build this challan.
              </p>
            </div>
          ) : (
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Live Stock Level</th>
                    <th>Unit Price (₹)</th>
                    <th>Order Quantity</th>
                    <th>Line Total (₹)</th>
                    <th style={{ textAlign: 'right' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => {
                    const lineTotal = item.quantity * item.unit_price;
                    const isStockShortage = item.current_stock < item.quantity;
                    return (
                      <tr key={item.product_id} className="line-item-row">
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {item.name}
                        </td>
                        <td>
                          <span className="sku-tag">{item.sku}</span>
                        </td>
                        <td>
                          <span className={isStockShortage ? 'low-stock-badge' : 'normal-stock-badge'}>
                            {item.current_stock} units available
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                            className="qty-input"
                          />
                        </td>
                        <td style={{ fontWeight: 800, color: '#0F172A' }}>
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="crm-modal-close-btn"
                            style={{ color: '#DC2626' }}
                            onClick={() => handleRemoveLineItem(item.product_id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Running Totals Footer */}
          {lineItems.length > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '16px 20px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={16} style={{ color: '#FF540E' }} />
                <span>Line item prices are snapshotted on save. Stock is deducted upon confirmation.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>TOTAL QUANTITY:</span>{' '}
                  <strong style={{ fontSize: '16px', color: '#0F172A' }}>{runningTotalQty} units</strong>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ESTIMATED TOTAL:</span>{' '}
                  <strong style={{ fontSize: '18px', color: '#FF540E' }}>
                    ₹{runningTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="crm-btn-secondary"
            onClick={() => navigate('/dashboard/challans')}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="crm-btn-primary"
            disabled={submitting}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isEditMode ? 'Update Draft Challan' : 'Save as Draft Challan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChallanFormPage;
