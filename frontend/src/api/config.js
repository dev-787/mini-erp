import { clearAuthStore } from '../store/authStore';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5001/api';
  }

  // Deployed production API fallback
  return 'https://mini-erp-u8vt.onrender.com/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const getAccessToken = () => {
  try {
    return localStorage.getItem('access_token');
  } catch (e) {
    return null;
  }
};

export const getRefreshToken = () => {
  try {
    return localStorage.getItem('refresh_token');
  } catch (e) {
    return null;
  }
};

export const setAuthTokens = ({ accessToken, refreshToken }) => {
  try {
    if (accessToken) localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  } catch (e) {
    console.error('Failed to save auth tokens:', e);
  }
};

export const clearAuthTokens = () => {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  } catch (e) {
    console.error('Failed to clear auth tokens:', e);
  }
};

// Single-flight promise mutex to prevent concurrent refresh race conditions
let refreshPromise = null;

const executeRefreshToken = async () => {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    clearAuthTokens();
    clearAuthStore();
    return null;
  }

  try {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
      credentials: 'include',
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      if (refreshData.token) {
        setAuthTokens({ accessToken: refreshData.token, refreshToken: refreshData.refreshToken });
        return refreshData.token;
      }
    }

    clearAuthTokens();
    clearAuthStore();
    return null;
  } catch (err) {
    clearAuthTokens();
    clearAuthStore();
    return null;
  } finally {
    refreshPromise = null;
  }
};

const performRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = executeRefreshToken();
  }
  return refreshPromise;
};

export const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response = await fetch(url, config);

  // If 401 Unauthorized and not calling auth endpoints directly
  if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/accept-invite') {
    const newToken = await performRefresh();

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...config, headers });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/accept-invite') {
      clearAuthTokens();
      clearAuthStore();
    }
    const error = new Error(data.message || 'An API error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
