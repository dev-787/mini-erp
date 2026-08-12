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
    credentials: 'include', // Automatically send and receive httpOnly cookies
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response = await fetch(url, config);

  // If 401 Unauthorized and not calling refresh/login/accept-invite, attempt silent refresh
  if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/accept-invite') {
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
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/accept-invite') {
      clearAuthStore();
    }
    const error = new Error(data.message || 'An API error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// Auth API Methods
export const login = async ({ email, password }) => {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const logout = async () => {
  return request('/auth/logout', {
    method: 'POST',
  });
};

export const fetchMe = async () => {
  return request('/auth/me', {
    method: 'GET',
  });
};

export const refresh = async () => {
  return request('/auth/refresh', {
    method: 'POST',
  });
};

// Invite System Methods
export const createInvite = async ({ email, role }) => {
  return request('/auth/invite', {
    method: 'POST',
    body: { email, role },
  });
};

export const getInviteByToken = async (token) => {
  return request(`/auth/invite/${encodeURIComponent(token)}`, {
    method: 'GET',
  });
};

export const acceptInvite = async ({ token, name, password }) => {
  return request('/auth/accept-invite', {
    method: 'POST',
    body: { token, name, password },
  });
};

export const getInvites = async () => {
  return request('/auth/invites', {
    method: 'GET',
  });
};

export const revokeInvite = async (inviteId) => {
  return request(`/auth/invites/${inviteId}`, {
    method: 'DELETE',
  });
};

export const resendInvite = async (inviteId) => {
  return request(`/auth/invites/${inviteId}/resend`, {
    method: 'POST',
  });
};

// Session Management Methods
export const getSessions = async () => {
  return request('/auth/sessions', {
    method: 'GET',
  });
};

export const revokeSession = async (sessionId) => {
  return request(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};
