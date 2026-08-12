import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, History, Shield, Package, FileText, User } from 'lucide-react';
import { fetchAuditLogs } from '../../api/audit.api';
import './products/products.css';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAuditLogs({
        page,
        limit,
        category: categoryFilter,
        search: search.trim(),
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
      if (err.status === 403) {
        setError('You do not have permission to view system audit logs.');
      } else {
        setError(err.message || 'Failed to load system audit logs.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Stock':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: '#F0F9FF',
            color: '#0284C7',
            border: '1px solid #BAE6FD',
          }}>
            <Package size={13} /> Stock
          </span>
        );
      case 'Challan':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: '#FFF7ED',
            color: '#FF540E',
            border: '1px solid #FFEDD5',
          }}>
            <FileText size={13} /> Challan
          </span>
        );
      case 'Customer':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: '#F3E8FF',
            color: '#9333EA',
            border: '1px solid #E9D5FF',
          }}>
            <User size={13} /> Customer
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FECACA',
          }}>
            <Shield size={13} /> Security
          </span>
        );
    }
  };

  return (
    <div className="prod-container">
      {/* Header Card */}
      <div className="prod-header-card">
        <div>
          <h1 className="prod-header-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={24} style={{ color: '#FF540E' }} />
            System Audit Trail & Activity Log
          </h1>
          <p className="prod-header-subtitle">
            Immutable audit record of all warehouse stock movements, challan confirmations, customer CRM notes, and security events.
          </p>
        </div>

        <button
          type="button"
          className="crm-btn-secondary"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="prod-toolbar">
        {/* Search Input */}
        <div className="prod-search-wrapper">
          <Search size={16} className="prod-search-icon" />
          <input
            type="text"
            className="prod-search-input"
            placeholder="Search audit action, details, ref, or user..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Category & Date Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: '#64748B' }} />

          <select
            className="crm-select-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Categories</option>
            <option value="Stock">Stock Movements</option>
            <option value="Challan">Sales Challans</option>
            <option value="Customer">Customer CRM</option>
            <option value="Security">Security & Invites</option>
          </select>

          <input
            type="date"
            className="crm-select-filter"
            style={{ padding: '6px 10px', fontSize: '13px' }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />

          <input
            type="date"
            className="crm-select-filter"
            style={{ padding: '6px 10px', fontSize: '13px' }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Audit Log Table Card */}
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
                    <th>Date & Time</th>
                    <th>Category</th>
                    <th>Action Event</th>
                    <th>Audit Details</th>
                    <th>Entity Reference</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '110px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '20px', width: '70px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '220px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '90px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                        <History size={36} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: '0 0 8px' }}>
                          No audit log entries found
                        </p>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                          {search || categoryFilter !== 'All' || dateFrom || dateTo
                            ? 'No activity logs match your active filters.'
                            : 'System audit logs will automatically record as actions are performed.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((item) => (
                      <tr key={item.id}>
                        <td style={{ color: '#64748B', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {formatDate(item.created_at)}
                        </td>
                        <td>{getCategoryBadge(item.category)}</td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {item.action}
                        </td>
                        <td style={{ fontSize: '13px', color: '#334155', maxWidth: '360px', wordBreak: 'break-word' }}>
                          {item.details}
                        </td>
                        <td>
                          <span className="sku-tag">{item.entity_ref || '—'}</span>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '13px', color: '#475569' }}>
                          {item.performed_by || 'System User'}
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
                  {Math.min(page * limit, total)} of {total} audit records
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
                    <option value={15}>15 per page</option>
                    <option value={30}>30 per page</option>
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

export default AuditLogPage;
