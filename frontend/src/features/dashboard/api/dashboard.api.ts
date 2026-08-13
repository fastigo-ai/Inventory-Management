import { api } from '@/shared/api/axios';

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const getSitePortalDashboardSummary = async (params?: { contractorId?: string; tempCode?: string }) => {
  const response = await api.get('/dashboard/site-portal-summary', { params });
  return response.data;
};
