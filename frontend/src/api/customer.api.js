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

export const fetchCustomers = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.customer_type) query.append('customer_type', params.customer_type);

  const queryString = query.toString();
  const endpoint = `/customers${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};

export const fetchCustomerById = async (id) => {
  return request(`/customers/${id}`, { method: 'GET' });
};

export const createCustomer = async (customerData) => {
  return request('/customers', {
    method: 'POST',
    body: customerData,
  });
};

export const updateCustomer = async (id, customerData) => {
  return request(`/customers/${id}`, {
    method: 'PATCH',
    body: customerData,
  });
};

export const fetchCustomerNotes = async (customerId) => {
  return request(`/customers/${customerId}/notes`, { method: 'GET' });
};

export const addCustomerNote = async (customerId, noteText) => {
  return request(`/customers/${customerId}/notes`, {
    method: 'POST',
    body: { note: noteText },
  });
};
