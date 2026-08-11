import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, ChevronLeft, ChevronRight, AlertTriangle, Filter } from 'lucide-react';
import { fetchProducts } from '../../../api/product.api';
import { useAuthStore } from '../../../store/authStore';
import ProductFormModal from './ProductFormModal';
import './products.css';

const ProductsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const canWrite = userRole === 'admin' || userRole === 'warehouse';

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchProducts({
        page,
        limit,
        search: search.trim(),
        category: categoryFilter,
        low_stock: lowStockOnly,
      });
      setProducts(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Fetch products error:', err);
      if (err.status === 403) {
        setError('You do not have permission to access product catalog.');
      } else {
        setError(err.message || 'Failed to load product catalog.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter, lowStockOnly]);

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

  // Extract unique categories for filter dropdown
  const categoriesList = ['Raw Materials', 'Hardware', 'Plastics', 'Packaging'];

  return (
    <div className="prod-container">
      {/* Top Header Card */}
      <div className="prod-header-card">
        <div>
          <h1 className="prod-header-title">Product Catalog & Stock Status</h1>
          <p className="prod-header-subtitle">
            Inventory master list, SKU definitions, pricing, and stock level monitoring.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            <span>Add Product</span>
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
            placeholder="Search by product name or SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Filters & Low Stock Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: '#64748B' }} />

          {/* Category Filter */}
          <select
            className="crm-select-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle Button */}
          <button
            type="button"
            className={`prod-toggle-btn ${lowStockOnly ? 'active' : ''}`}
            onClick={() => {
              setLowStockOnly((prev) => !prev);
              setPage(1);
            }}
          >
            <AlertTriangle size={15} />
            <span>{lowStockOnly ? 'Showing Low Stock' : 'Low Stock Only'}</span>
          </button>
        </div>
      </div>

      {/* Product Table Card */}
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
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Storage Location</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    // Skeleton Loading Rows
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '150px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '80px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '100px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '70px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '50px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '20px', width: '80px' }} /></td>
                        <td><div className="skeleton-box" style={{ height: '16px', width: '110px' }} /></td>
                        <td style={{ textAlign: 'right' }}><div className="skeleton-box" style={{ height: '28px', width: '60px', marginLeft: 'auto' }} /></td>
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    // Empty State
                    <tr>
                      <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: '0 0 8px' }}>
                          No products found
                        </p>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 16px' }}>
                          {search || categoryFilter || lowStockOnly
                            ? 'No items match your active filters.'
                            : 'Add your first product to start tracking inventory.'}
                        </p>
                        {canWrite && (
                          <button
                            type="button"
                            className="crm-btn-primary"
                            onClick={() => setIsModalOpen(true)}
                          >
                            <Plus size={16} /> Add Product
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    // Product Rows
                    products.map((prod) => (
                      <tr
                        key={prod.id}
                        onClick={() => navigate(`/dashboard/products/${prod.id}`)}
                      >
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>
                          {prod.name}
                        </td>
                        <td>
                          <span className="sku-tag">{prod.sku}</span>
                        </td>
                        <td>{prod.category || '—'}</td>
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>
                          ₹{Number(prod.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '15px' }}>
                          <span className={prod.is_low_stock ? 'stock-hero-number low' : ''} style={{ fontSize: '15px' }}>
                            {prod.current_stock}
                          </span>{' '}
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>units</span>
                        </td>
                        <td>
                          {prod.is_low_stock ? (
                            <span className="low-stock-badge">
                              <AlertTriangle size={13} /> Low Stock ({prod.min_stock_alert})
                            </span>
                          ) : (
                            <span className="normal-stock-badge">
                              Sufficient Stock
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>
                          {prod.location || 'Unassigned'}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="crm-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => navigate(`/dashboard/products/${prod.id}`)}
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
                  {Math.min(page * limit, total)} of {total} products
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

      {/* Add Product Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(created) => {
          setIsModalOpen(false);
          if (created && created.id) {
            navigate(`/dashboard/products/${created.id}`);
          } else {
            loadData();
          }
        }}
      />
    </div>
  );
};

export default ProductsListPage;
