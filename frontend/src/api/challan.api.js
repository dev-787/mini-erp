import { request } from './config';

export const fetchChallans = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status) query.append('status', params.status);
  if (params.customer_id) query.append('customer_id', params.customer_id);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString();
  const endpoint = `/challans${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};

export const fetchChallanById = async (id) => {
  return request(`/challans/${id}`, { method: 'GET' });
};

export const createChallan = async (challanData) => {
  return request('/challans', {
    method: 'POST',
    body: challanData,
  });
};

export const updateChallan = async (id, challanData) => {
  return request(`/challans/${id}`, {
    method: 'PATCH',
    body: challanData,
  });
};

export const confirmChallan = async (id) => {
  return request(`/challans/${id}/confirm`, {
    method: 'POST',
  });
};

export const cancelChallan = async (id) => {
  return request(`/challans/${id}/cancel`, {
    method: 'POST',
  });
};
