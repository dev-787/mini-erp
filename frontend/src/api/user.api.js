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

export const fetchUsers = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.role) query.append('role', params.role);
  if (params.status) query.append('status', params.status);

  const queryString = query.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};

export const updateUserStatus = async (id, status) => {
  return request(`/users/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
};
