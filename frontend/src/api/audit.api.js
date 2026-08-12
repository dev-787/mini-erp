import { clearAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

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

export const fetchAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.category) query.append('category', params.category);
  if (params.search) query.append('search', params.search);
  if (params.date_from) query.append('date_from', params.date_from);
  if (params.date_to) query.append('date_to', params.date_to);

  const queryString = query.toString();
  const endpoint = `/audit-log${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};
