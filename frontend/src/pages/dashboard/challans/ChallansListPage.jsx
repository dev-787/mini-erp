import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Filter, FileText } from 'lucide-react';
import { fetchChallans } from '../../../api/challan.api';
import { useAuthStore } from '../../../store/authStore';
import './challans.css';

const ChallansListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const canCreate = userRole === 'admin' || userRole === 'sales';

  const [challans, setChallans] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchChallans({
        page,
        limit,
        search: search.trim(),
        status: statusFilter || undefined,
      });
      setChallans(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Fetch challans error:', err);
      if (err.status === 403) {
        setError('You do not have permission to view sales challans.');
      } else {
        setError(err.message || 'Failed to load sales challans.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (isoDate) => {
    if (!isoDate) return '—';
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  return (
    <div className="prod-container">
      {/* Top Header Card */}
      <div className="prod-header-card">
        <div>
          <h1 className="prod-header-title">Sales Challan Management</h1>
          <p className="prod-header-subtitle">
            Issue, confirm, and audit sales delivery challans tied directly to real inventory stock.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => navigate('/dashboard/challans/new')}
          >
            <Plus size={18} />
            <span>New Challan</span>
          </button>
        )}
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="prod-toolbar">
        {/* Search Input */}
        <div className="prod-search-wrapper">
          <Search size={16} className="prod-search-icon" />
          <input
            type="text"
            className="prod-search-input"
            placeholder="Search by Challan # or Customer name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={16} style={{ color: '#64748B' }} />
          <select
            className="crm-select-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="crm-table-card">
        {error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#DC2626' }}>
            <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>{error}</p>
          </div>
        ) : (
          <>
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Challan #</th>
                    <th>Customer Name</th>
                    <th>Total Qty</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="skeleton-box" style={{ height: '18px', width: '100px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '150px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '60px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '90px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '20px', width: '70px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '90px' }} /></td>
                        <td style={{ textAlign: 'right' }}><div className="skeleton-box" style={{ height: '28px', width: '60px', marginLeft: 'auto' }} /></td>
                      </tr>
                    ))
                  ) : challans.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <FileText size={36} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: '0 0 8px' }}>
                          No sales challans found
                        </p>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 16px' }}>
                          {search || statusFilter
                            ? 'No challans match your active filters.'
                            : 'Create your first sales delivery challan as a Draft.'}
                        </p>
                        {canCreate && (
                          <button
                            type="button"
                            className="crm-btn-primary"
                            onClick={() => navigate('/dashboard/challans/new')}
                          >
                            <Plus size={16} /> New Challan
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    challans.map((ch) => (
                      <tr
                        key={ch.id}
                        onClick={() => navigate(`/dashboard/challans/${ch.id}`)}
                      >
                        <td>
                          <span className="challan-number-tag">{ch.challan_number}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {ch.customer_name}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {ch.total_quantity} units
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          ₹{Number(ch.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>{getStatusBadge(ch.status)}</td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>
                          {ch.created_by_name || 'System User'}
                        </td>
                        <td style={{ fontSize: '13px', color: '#64748B' }}>
                          {formatDate(ch.created_at)}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="crm-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => navigate(`/dashboard/challans/${ch.id}`)}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && total > 0 && (
              <div className="crm-pagination">
                <div>
                  Showing {Math.min((page - 1) * limit + 1, total)} to{' '}
                  {Math.min(page * limit, total)} of {total} challans
                </div>

                <div className="crm-pagination-controls">
                  <select
                    className="crm-select-filter"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>

                  <button
                    type="button"
                    className="crm-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', padding: '0 4px' }}>
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="crm-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChallansListPage;
