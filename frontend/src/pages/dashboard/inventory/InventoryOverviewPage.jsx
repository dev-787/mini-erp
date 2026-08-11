import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, DollarSign, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Plus, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, History
} from 'lucide-react';
import {
  fetchInventorySummary,
  fetchLowStockProducts,
  fetchGlobalStockMovements,
} from '../../../api/product.api';
import QuickLogMovementModal from './QuickLogMovementModal';
import '../products/products.css';

const InventoryOverviewPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Summary Cards State
  const [summary, setSummary] = useState({
    totalInventoryValue: 0,
    totalProducts: 0,
    lowStockCount: 0,
    todayMovementsIn: 0,
    todayMovementsOut: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Low Stock Alerts State
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  // Global Stock Ledger State
  const [movements, setMovements] = useState([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [ledgerError, setLedgerError] = useState('');

  // Ledger Filter States initialized from URL search params
  const [ledgerPage, setLedgerPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [ledgerLimit] = useState(15);
  const [ledgerSearch, setLedgerSearch] = useState(searchParams.get('search') || '');
  const [ledgerType, setLedgerType] = useState(searchParams.get('movement_type') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');

  // Quick Log Modal State
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [quickLogProductId, setQuickLogProductId] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // 1. Fetch Summary
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchInventorySummary();
      setSummary(data || {});
    } catch (err) {
      console.error('Failed to load inventory summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // 2. Fetch Low Stock Alerts
  const loadLowStock = useCallback(async () => {
    setLoadingLowStock(true);
    try {
      const res = await fetchLowStockProducts();
      setLowStockProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load low stock list:', err);
    } finally {
      setLoadingLowStock(false);
    }
  }, []);

  // 3. Fetch Global Stock Ledger
  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    setLedgerError('');

    try {
      const res = await fetchGlobalStockMovements({
        page: ledgerPage,
        limit: ledgerLimit,
        search: ledgerSearch.trim(),
        movement_type: ledgerType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setMovements(res.data || []);
      setTotalMovements(res.total || 0);
    } catch (err) {
      console.error('Failed to load global stock ledger:', err);
      if (err.status === 403) {
        setLedgerError('You do not have permission to view global inventory ledger.');
      } else {
        setLedgerError(err.message || 'Failed to load stock movement ledger.');
      }
    } finally {
      setLoadingLedger(false);
    }
  }, [ledgerPage, ledgerLimit, ledgerSearch, ledgerType, dateFrom, dateTo]);

  // Sync state to URL params for bookmarkable ledger filters
  useEffect(() => {
    const params = {};
    if (ledgerPage > 1) params.page = ledgerPage;
    if (ledgerSearch) params.search = ledgerSearch;
    if (ledgerType) params.movement_type = ledgerType;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    setSearchParams(params, { replace: true });
  }, [ledgerPage, ledgerSearch, ledgerType, dateFrom, dateTo, setSearchParams]);

  const loadAllData = useCallback(() => {
    loadSummary();
    loadLowStock();
    loadLedger();
  }, [loadSummary, loadLowStock, loadLedger]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Debounced search for ledger
  const [searchInput, setSearchInput] = useState(ledgerSearch);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLedgerSearch(searchInput);
      setLedgerPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const ledgerTotalPages = Math.ceil(totalMovements / ledgerLimit) || 1;

  const handleOpenQuickLog = (prodId = '') => {
    setQuickLogProductId(prodId);
    setIsQuickLogOpen(true);
  };

  const handleMovementSuccess = () => {
    setToastMessage('Stock movement logged successfully!');
    setTimeout(() => setToastMessage(''), 4000);
    loadAllData();
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

  return (
    <div className="prod-container">
      {/* Header Card */}
      <div className="prod-header-card">
        <div>
          <h1 className="prod-header-title">Warehouse Inventory Control Center</h1>
          <p className="prod-header-subtitle">
            Company-wide stock valuation, emergency low-stock alerts, and global movement audit ledger.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="crm-btn-secondary"
            onClick={loadAllData}
          >
            <RefreshCw size={16} /> Refresh Data
          </button>

          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => handleOpenQuickLog()}
          >
            <Plus size={18} />
            <span>Log Stock Movement</span>
          </button>
        </div>
      </div>

      {/* Success Toast Banner */}
      {toastMessage && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#ECFDF5',
          color: '#047857',
          border: '1px solid #A7F3D0',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* 1. Top Summary Cards (4 Column Grid) */}
      <div className="crm-stats-grid">
        {/* Card 1: Total Inventory Value */}
        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Total Inventory Value</span>
            <div className="crm-stat-icon-wrapper" style={{ backgroundColor: '#FFF7ED', color: '#FF540E' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="crm-stat-value">
            {loadingSummary ? (
              <div className="skeleton-box" style={{ height: '32px', width: '120px' }} />
            ) : (
              `₹${Number(summary.totalInventoryValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            )}
          </div>
          <div className="crm-stat-subtitle">Aggregate valuation at cost</div>
        </div>

        {/* Card 2: Total Products */}
        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Total Product SKUs</span>
            <div className="crm-stat-icon-wrapper" style={{ backgroundColor: '#F0F9FF', color: '#0284C7' }}>
              <Package size={20} />
            </div>
          </div>
          <div className="crm-stat-value">
            {loadingSummary ? (
              <div className="skeleton-box" style={{ height: '32px', width: '60px' }} />
            ) : (
              summary.totalProducts
            )}
          </div>
          <div className="crm-stat-subtitle">Active catalog items</div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Low Stock Alerts</span>
            <div
              className="crm-stat-icon-wrapper"
              style={{
                backgroundColor: summary.lowStockCount > 0 ? '#FEF2F2' : '#ECFDF5',
                color: summary.lowStockCount > 0 ? '#DC2626' : '#059669',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div
            className="crm-stat-value"
            style={{ color: summary.lowStockCount > 0 ? '#DC2626' : '#0F172A' }}
          >
            {loadingSummary ? (
              <div className="skeleton-box" style={{ height: '32px', width: '50px' }} />
            ) : (
              summary.lowStockCount
            )}
          </div>
          <div className="crm-stat-subtitle">
            {summary.lowStockCount > 0 ? 'Items below alert threshold' : 'All items sufficiently stocked'}
          </div>
        </div>

        {/* Card 4: Today's Activity */}
        <div className="crm-stat-card">
          <div className="crm-stat-header">
            <span className="crm-stat-title">Today's Activity</span>
            <div className="crm-stat-icon-wrapper" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
              <History size={20} />
            </div>
          </div>
          <div className="crm-stat-value" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {loadingSummary ? (
              <div className="skeleton-box" style={{ height: '32px', width: '100px' }} />
            ) : (
              <>
                <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <ArrowDownRight size={18} /> {summary.todayMovementsIn} in
                </span>
                <span style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <ArrowUpRight size={18} /> {summary.todayMovementsOut} out
                </span>
              </>
            )}
          </div>
          <div className="crm-stat-subtitle">Stock movements recorded today</div>
        </div>
      </div>

      {/* 2. Low Stock Alerts Section */}
      <div className="crm-table-card">
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} style={{ color: summary.lowStockCount > 0 ? '#DC2626' : '#059669' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Emergency Low Stock Alerts ({lowStockProducts.length})
            </h2>
          </div>
        </div>

        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Min Alert Threshold</th>
                <th>Storage Location</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingLowStock ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx}>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '140px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '80px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '60px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '60px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                    <td style={{ textAlign: 'right' }}><div className="skeleton-box" style={{ height: '28px', width: '80px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : lowStockProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#059669' }}>
                    <CheckCircle2 size={24} style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>
                      All products are sufficiently stocked.
                    </p>
                  </td>
                </tr>
              ) : (
                lowStockProducts.map((prod) => (
                  <tr key={prod.id} onClick={() => navigate(`/dashboard/products/${prod.id}`)}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {prod.name}
                    </td>
                    <td>
                      <span className="sku-tag">{prod.sku}</span>
                    </td>
                    <td>
                      <span className="stock-hero-number low" style={{ fontSize: '15px' }}>
                        {prod.current_stock}
                      </span>{' '}
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>units</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#475569' }}>
                      {prod.min_stock_alert} units
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>
                      {prod.location || 'Unassigned'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="crm-btn-primary"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                        onClick={() => handleOpenQuickLog(prod.id)}
                      >
                        <Plus size={14} /> Log Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Global Stock Movement Ledger */}
      <div className="crm-table-card">
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Global Stock Movement Ledger (Audit Log)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>
              Cross-product warehouse activity audit trail across all stock movements.
            </p>
          </div>
        </div>

        {/* Ledger Filter Toolbar */}
        <div className="prod-toolbar" style={{ border: 'none', borderBottom: '1px solid #E2E8F0', borderRadius: 0 }}>
          {/* Search Input */}
          <div className="prod-search-wrapper">
            <Search size={16} className="prod-search-icon" />
            <input
              type="text"
              className="prod-search-input"
              placeholder="Search product, SKU, or reason..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Filter size={16} style={{ color: '#64748B' }} />

            {/* Movement Type Filter */}
            <select
              className="crm-select-filter"
              value={ledgerType}
              onChange={(e) => {
                setLedgerType(e.target.value);
                setLedgerPage(1);
              }}
            >
              <option value="">All Movement Types</option>
              <option value="IN">Stock IN only</option>
              <option value="OUT">Stock OUT only</option>
            </select>

            {/* Date From */}
            <input
              type="date"
              className="crm-select-filter"
              style={{ fontSize: '13px', padding: '6px 10px' }}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setLedgerPage(1);
              }}
            />

            {/* Date To */}
            <input
              type="date"
              className="crm-select-filter"
              style={{ fontSize: '13px', padding: '6px 10px' }}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setLedgerPage(1);
              }}
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason / Reference</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {ledgerError ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#DC2626' }}>
                    {ledgerError}
                  </td>
                </tr>
              ) : loadingLedger ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '140px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '80px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '20px', width: '60px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '50px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '150px' }} /></td>
                    <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                      No stock movements found
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                      {ledgerSearch || ledgerType || dateFrom || dateTo
                        ? 'No movements match your active filters.'
                        : 'Log a movement using the button above to start building the warehouse audit trail.'}
                    </p>
                  </td>
                </tr>
              ) : (
                movements.map((mov) => (
                  <tr
                    key={mov.id}
                    onClick={() => navigate(`/dashboard/products/${mov.product_id}`)}
                  >
                    <td style={{ color: '#64748B', fontSize: '13px' }}>
                      {formatRelativeTime(mov.created_at)}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {mov.product_name || '—'}
                    </td>
                    <td>
                      <span className="sku-tag">{mov.product_sku || '—'}</span>
                    </td>
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
                    <td style={{ fontSize: '13px', color: '#334155' }}>
                      {mov.reason}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: '13px', color: '#475569' }}>
                      {mov.created_by_name || 'System User'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Pagination */}
        {!loadingLedger && totalMovements > 0 && (
          <div className="crm-pagination">
            <div>
              Showing {Math.min((ledgerPage - 1) * ledgerLimit + 1, totalMovements)} to{' '}
              {Math.min(ledgerPage * ledgerLimit, totalMovements)} of {totalMovements} entries
            </div>

            <div className="crm-pagination-controls">
              <button
                type="button"
                className="crm-page-btn"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', padding: '0 4px' }}>
                Page {ledgerPage} of {ledgerTotalPages}
              </span>

              <button
                type="button"
                className="crm-page-btn"
                disabled={ledgerPage >= ledgerTotalPages}
                onClick={() => setLedgerPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Log Movement Modal */}
      <QuickLogMovementModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        initialProductId={quickLogProductId}
        onSuccess={handleMovementSuccess}
      />
    </div>
  );
};

export default InventoryOverviewPage;
