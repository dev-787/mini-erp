import { request } from './config';

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
