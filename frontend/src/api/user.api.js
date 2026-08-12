import { request } from './config';

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
