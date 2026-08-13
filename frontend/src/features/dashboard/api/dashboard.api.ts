import { api } from '@/shared/api/axios';

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const getSitePortalDashboardSummary = async () => {
  const response = await api.get('/dashboard/site-portal-summary');
  return response.data;
};
