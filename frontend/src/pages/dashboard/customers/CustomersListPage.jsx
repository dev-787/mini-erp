import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { fetchCustomers } from '../../../api/customer.api';
import { useAuthStore } from '../../../store/authStore';
import CustomerFormModal from './CustomerFormModal';
import './customers.css';

const CustomersListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const canWrite = userRole === 'admin' || userRole === 'sales';

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCustomers({
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
        customer_type: typeFilter,
      });
      setCustomers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Fetch customers error:', err);
      if (err.status === 403) {
        setError('You do not have permission to view customers.');
      } else {
        setError(err.message || 'Failed to load customers list.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search handler
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status) => {
    const s = (status || 'Lead').toLowerCase();
    return (
      <span className={`status-badge ${s}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="crm-container">
      {/* Top Header Card */}
      <div className="crm-header-card">
        <div>
          <h1 className="crm-header-title">Customer Relationship Management</h1>
          <p className="crm-header-subtitle">
            Directory of buyers, active accounts, leads, and follow-up schedules.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="crm-toolbar">
        <div className="crm-search-wrapper">
          <Search size={16} className="crm-search-icon" />
          <input
            type="text"
            className="crm-search-input"
            placeholder="Search by name, business, or mobile..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="crm-filter-group">
          <Filter size={16} style={{ color: '#64748B' }} />

          {/* Status Filter */}
          <select
            className="crm-select-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">All Statuses</option>
            <option value="Lead">Lead</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Customer Type Filter */}
          <select
            className="crm-select-filter"
            value={typeFilter}
            onChange={handleTypeFilterChange}
          >
            <option value="">All Types</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Distributor">Distributor</option>
            <option value="Retail">Retail</option>
          </select>
        </div>
      </div>

      {/* Main Table Area */}
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
                    <th>Customer Name</th>
                    <th>Business Name</th>
                    <th>Mobile</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Follow-up Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    // Skeleton Loading Rows
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '120px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '140px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '20px', width: '70px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '20px', width: '60px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '90px' }} /></td>
                        <td style={{ textAlign: 'right' }}><div className="skeleton-box" style={{ height: '28px', width: '60px', marginLeft: 'auto' }} /></td>
                      </tr>
                    ))
                  ) : customers.length === 0 ? (
                    // Empty State
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: '0 0 8px' }}>
                          No customers found
                        </p>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 16px' }}>
                          {search || statusFilter || typeFilter
                            ? 'No matches found for the applied search/filters.'
                            : 'Get started by creating your first customer account.'}
                        </p>
                        {canWrite && (
                          <button
                            type="button"
                            className="crm-btn-primary"
                            onClick={() => setIsModalOpen(true)}
                          >
                            <Plus size={16} /> Add New Customer
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    // Real Customer Rows
                    customers.map((cust) => (
                      <tr
                        key={cust.id}
                        onClick={() => navigate(`/dashboard/customers/${cust.id}`)}
                      >
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>
                          {cust.name}
                        </td>
                        <td>{cust.business_name || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {cust.mobile}
                        </td>
                        <td>
                          <span className="type-pill">{cust.customer_type}</span>
                        </td>
                        <td>{getStatusBadge(cust.status)}</td>
                        <td>
                          {cust.follow_up_date
                            ? new Date(cust.follow_up_date).toLocaleDateString()
                            : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="crm-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => navigate(`/dashboard/customers/${cust.id}`)}
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
                  {Math.min(page * limit, total)} of {total} customers
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

      {/* Add Customer Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(created) => {
          setIsModalOpen(false);
          if (created && created.id) {
            navigate(`/dashboard/customers/${created.id}`);
          } else {
            loadData();
          }
        }}
      />
    </div>
  );
};

export default CustomersListPage;
