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

  let response = await fetch(url, config);

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
    const error = new Error(data.message || 'An API error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const fetchDashboardSummary = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.range) query.append('range', params.range);
  if (params.dateFrom) query.append('date_from', params.dateFrom);
  if (params.dateTo) query.append('date_to', params.dateTo);

  const queryString = query.toString();
  const endpoint = `/dashboard/summary${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};
