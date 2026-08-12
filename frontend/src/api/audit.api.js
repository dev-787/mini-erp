import { request } from './config';

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
