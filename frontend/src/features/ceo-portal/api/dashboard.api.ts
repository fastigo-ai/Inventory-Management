import { api } from '@/shared/api/axios';

export const fetchCeoDashboardData = async (filters: any) => {
  const { data } = await api.get('/dashboard/ceo-portal-summary', { params: filters });
  return data.data;
};

export const fetchCeoDashboardV2Data = async (filters: any) => {
  const { data } = await api.get('/dashboard/ceo-portal-v2-summary', { params: filters });
  return data.data;
};
