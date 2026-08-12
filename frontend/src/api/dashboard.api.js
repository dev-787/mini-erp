import { request } from './config';

export const fetchDashboardSummary = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.range) query.append('range', params.range);
  if (params.dateFrom) query.append('date_from', params.dateFrom);
  if (params.dateTo) query.append('date_to', params.dateTo);

  const queryString = query.toString();
  const endpoint = `/dashboard/summary${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET' });
};
