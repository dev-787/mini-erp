import { clearAuthStore } from '../store/authStore';
import { request, setAuthTokens, clearAuthTokens } from './config';

// Auth API Methods
export const login = async ({ email, password }) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (data.token) {
    setAuthTokens({ accessToken: data.token, refreshToken: data.refreshToken });
  }
  return data;
};

export const logout = async () => {
  try {
    return await request('/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAuthTokens();
    clearAuthStore();
  }
};

export const fetchMe = async () => {
  return request('/auth/me', {
    method: 'GET',
  });
};

export const refresh = async () => {
  const data = await request('/auth/refresh', {
    method: 'POST',
  });
  if (data.token) {
    setAuthTokens({ accessToken: data.token, refreshToken: data.refreshToken });
  }
  return data;
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
  const data = await request('/auth/accept-invite', {
    method: 'POST',
    body: { token, name, password },
  });
  if (data.token) {
    setAuthTokens({ accessToken: data.token, refreshToken: data.refreshToken });
  }
  return data;
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
