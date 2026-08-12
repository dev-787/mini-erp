import { clearAuthStore } from '../store/authStore';
import { API_BASE_URL } from './config';

const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response = await fetch(url, config);

  // If 401 Unauthorized, attempt silent refresh
  if (response.status === 401 && endpoint !== '/auth/refresh') {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        response = await fetch(url, config);
      } else {
        clearAuthStore();
      }
    } catch (err) {
      clearAuthStore();
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthStore();
    }
    const error = new Error(data.message || data.error || 'An API error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const fetchProducts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.category) query.append('category', params.category);
  if (params.low_stock) query.append('low_stock', 'true');

  const queryString = query.toString();
  const endpoint = `/products${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};

export const fetchProductById = async (id) => {
  return request(`/products/${id}`, { method: 'GET' });
};

export const createProduct = async (productData) => {
  return request('/products', {
    method: 'POST',
    body: productData,
  });
};

export const updateProduct = async (id, productData) => {
  return request(`/products/${id}`, {
    method: 'PATCH',
    body: productData,
  });
};

export const fetchStockMovements = async (productId, page = 1, limit = 20) => {
  return request(`/products/${productId}/stock-movements?page=${page}&limit=${limit}`, {
    method: 'GET',
  });
};

export const addStockMovement = async (productId, movementData) => {
  return request(`/products/${productId}/stock-movements`, {
    method: 'POST',
    body: movementData,
  });
};

export const fetchLowStockProducts = async () => {
  return request('/inventory/low-stock', { method: 'GET' });
};

export const fetchInventorySummary = async () => {
  return request('/inventory/summary', { method: 'GET' });
};

export const fetchGlobalStockMovements = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.product_id) query.append('product_id', params.product_id);
  if (params.movement_type) query.append('movement_type', params.movement_type);
  if (params.date_from) query.append('date_from', params.date_from);
  if (params.date_to) query.append('date_to', params.date_to);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString();
  const endpoint = `/stock-movements${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};
