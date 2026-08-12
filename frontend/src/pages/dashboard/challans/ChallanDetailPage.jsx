import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, CheckCircle, XCircle, AlertTriangle, Loader2,
  User, Calendar, DollarSign, Package, AlertCircle
} from 'lucide-react';
import { fetchChallanById, confirmChallan, cancelChallan } from '../../../api/challan.api';
import { useAuthStore } from '../../../store/authStore';
import './challans.css';

const ChallanDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const isAdmin = userRole === 'admin';
  const isSales = userRole === 'sales';

  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  // Actions loading & error state
  const [actionLoading, setActionLoading] = useState(false);
  const [shortagesError, setShortagesError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadChallan = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError('');
    try {
      const data = await fetchChallanById(id);
      setChallan(data);
    } catch (err) {
      console.error('Challan detail load error:', err);
      if (err.status === 404) {
        setNotFound(true);
      } else if (err.status === 403) {
        setError('You do not have permission to view this sales challan.');
      } else {
        setError(err.message || 'Failed to load challan details.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadChallan();
  }, [loadChallan]);

  // Confirm Challan Handler
  const handleConfirm = async () => {
    setActionLoading(true);
    setShortagesError(null);
    setActionSuccessMsg('');

    try {
      const res = await confirmChallan(id);
      setChallan(res.challan || res);
      setActionSuccessMsg('Sales challan confirmed successfully! Product stock has been deducted.');
    } catch (err) {
      console.error('Confirm challan error:', err);
      if (err.status === 409 && err.data && err.data.shortages) {
        setShortagesError({
          message: err.data.message || 'Insufficient stock for one or more items.',
          shortages: err.data.shortages,
        });
      } else {
        setShortagesError({
          message: err.message || 'Failed to confirm challan.',
          shortages: [],
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Challan Handler
  const handleCancel = async () => {
    setActionLoading(true);
    setShortagesError(null);
    setActionSuccessMsg('');
    setShowCancelModal(false);

    try {
      const res = await cancelChallan(id);
      setChallan(res.challan || res);
      setActionSuccessMsg('Sales challan cancelled successfully.');
    } catch (err) {
      console.error('Cancel challan error:', err);
      setShortagesError({
        message: err.message || 'Failed to cancel sales challan.',
        shortages: [],
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return '—';
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="status-badge confirmed">Confirmed</span>;
      case 'Cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      default:
        return <span className="status-badge draft">Draft</span>;
    }
  };

  if (loading) {
    return (
      <div className="prod-container">
        <div className="prod-header-card">
          <div className="skeleton-box" style={{ height: '32px', width: '200px' }} />
        </div>
        <div className="crm-detail-grid">
          <div className="crm-detail-card">
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
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Challan Not Found</h2>
          <p style={{ color: '#64748B', margin: '0 0 20px' }}>
            The requested sales challan reference does not exist.
          </p>
          <button type="button" className="crm-btn-primary" onClick={() => navigate('/dashboard/challans')}>
            <ArrowLeft size={16} /> Return to Challans List
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

  const isDraft = challan.status === 'Draft';
  const isConfirmed = challan.status === 'Confirmed';
  const isCancelled = challan.status === 'Cancelled';

  // Total calculations
  const grandTotalQty = (challan.items || []).reduce((sum, item) => sum + Number(item.quantity), 0);
  const grandTotalAmount = (challan.items || []).reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price_snapshot),
    0
  );

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="challan-number-tag" style={{ fontSize: '16px', padding: '4px 12px' }}>
              {challan.challan_number}
            </span>
            {getStatusBadge(challan.status)}
            <h1 className="prod-header-title" style={{ fontSize: '18px' }}>
              Customer: {' '}
              <span
                style={{ color: '#FF540E', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => navigate(`/dashboard/customers/${challan.customer_id}`)}
              >
                {challan.customer_name}
              </span>
            </h1>
          </div>
        </div>

        {/* Header Action Buttons (Role & Status Gated) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Draft Actions for Admin & Sales */}
          {isDraft && (isAdmin || isSales) && (
            <>
              <button
                type="button"
                className="crm-btn-secondary"
                onClick={() => navigate(`/dashboard/challans/${challan.id}/edit`)}
                disabled={actionLoading}
              >
                <Edit3 size={16} /> Edit Draft
              </button>

              <button
                type="button"
                className="crm-btn-secondary"
                style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <XCircle size={16} /> Cancel Draft
              </button>

              <button
                type="button"
                className="crm-btn-primary"
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                <span>Confirm & Deduct Stock</span>
              </button>
            </>
          )}

          {/* Confirmed Actions for Admin ONLY */}
          {isConfirmed && isAdmin && (
            <button
              type="button"
              className="crm-btn-secondary"
              style={{ borderColor: '#FCA5A5', color: '#DC2626', backgroundColor: '#FEF2F2' }}
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
            >
              <XCircle size={16} /> Cancel Confirmed (Reverse Stock)
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '12px',
          color: '#047857',
          fontWeight: 600,
          fontSize: '14px',
        }}>
          {actionSuccessMsg}
        </div>
      )}

      {/* Shortages Error Banner (409 Confirmation Error) */}
      {shortagesError && (
        <div className="shortages-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={22} style={{ color: '#DC2626' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                Confirmation Blocked: Insufficient Stock
              </div>
              <div style={{ fontSize: '13px', color: '#7F1D1D', marginTop: '2px' }}>
                {shortagesError.message}
              </div>
            </div>
          </div>

          {shortagesError.shortages && shortagesError.shortages.length > 0 && (
            <table className="shortages-table">
              <thead>
                <tr>
                  <th>Product Item</th>
                  <th>Requested Quantity</th>
                  <th>Available In Stock</th>
                  <th>Shortage Deficit</th>
                </tr>
              </thead>
              <tbody>
                {shortagesError.shortages.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.product}</td>
                    <td>{s.requested} units</td>
                    <td>{s.available} units</td>
                    <td style={{ color: '#DC2626', fontWeight: 700 }}>
                      -{s.requested - s.available} units short
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Audit Header Info Grid */}
      <div className="crm-stats-grid">
        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Created By</span>
            <User size={18} style={{ color: '#64748B' }} />
          </div>
          <div className="crm-stat-value" style={{ fontSize: '16px' }}>
            {challan.created_by_name || 'System User'}
          </div>
          <div className="crm-stat-subtitle">{formatDate(challan.created_at)}</div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Confirmation Status</span>
            <CheckCircle size={18} style={{ color: isConfirmed ? '#059669' : '#94A3B8' }} />
          </div>
          <div className="crm-stat-value" style={{ fontSize: '16px', color: isConfirmed ? '#059669' : '#0F172A' }}>
            {isConfirmed ? `Confirmed by ${challan.confirmed_by_name || 'User'}` : 'Not Confirmed'}
          </div>
          <div className="crm-stat-subtitle">
            {isConfirmed ? formatDate(challan.confirmed_at) : 'Awaiting confirmation'}
          </div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Total Ordered Qty</span>
            <Package size={18} style={{ color: '#0284C7' }} />
          </div>
          <div className="crm-stat-value" style={{ fontSize: '22px' }}>
            {grandTotalQty} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>units</span>
          </div>
          <div className="crm-stat-subtitle">{challan.items?.length || 0} unique line items</div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Total Agreed Value</span>
            <DollarSign size={18} style={{ color: '#FF540E' }} />
          </div>
          <div className="crm-stat-value" style={{ fontSize: '22px', color: '#FF540E' }}>
            ₹{grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="crm-stat-subtitle">Snapshotted price calculation</div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="crm-table-card">
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
            Agreed Line Items & Snapshotted Pricing
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            * Unit prices shown are snapshotted at time of creation.
          </span>
        </div>

        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Product Name (Snapshot)</th>
                <th>SKU Code</th>
                <th>Unit Price (Snapshot ₹)</th>
                <th>Quantity Ordered</th>
                <th style={{ textAlign: 'right' }}>Line Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(challan.items || []).map((item) => {
                const lineTotal = Number(item.quantity) * Number(item.unit_price_snapshot);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {item.product_name_snapshot}
                    </td>
                    <td>
                      <span className="sku-tag">{item.product_sku_snapshot}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(item.unit_price_snapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '15px' }}>
                      {item.quantity} units
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>
                      ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            {isCancelled && (
              <span style={{ color: '#DC2626', fontWeight: 700 }}>
                Cancelled by {challan.cancelled_by_name || 'User'} on {formatDate(challan.cancelled_at)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div>
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>TOTAL QUANTITY:</span>{' '}
              <strong style={{ fontSize: '18px', color: '#0F172A' }}>{grandTotalQty} units</strong>
            </div>

            <div>
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>CHALLAN GRAND TOTAL:</span>{' '}
              <strong style={{ fontSize: '22px', color: '#FF540E' }}>
                ₹{grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Cancelling Confirmed Challans */}
      {showCancelModal && (
        <div className="crm-modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} /> Cancel Confirmed Challan?
              </h2>
            </div>
            <div className="crm-form">
              <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to cancel confirmed challan <strong>#{challan.challan_number}</strong>?
              </p>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                Warning: This action is irreversible. All deducted line item quantities ({grandTotalQty} units) will be returned to inventory stock automatically via logged IN movements.
              </div>
            </div>
            <div className="crm-modal-footer">
              <button
                type="button"
                className="crm-btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
              >
                Go Back
              </button>
              <button
                type="button"
                className="crm-btn-primary"
                style={{ backgroundColor: '#DC2626' }}
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                <span>Yes, Cancel & Reverse Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanDetailPage;
