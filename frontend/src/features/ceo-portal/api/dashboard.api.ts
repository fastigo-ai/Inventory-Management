import { api } from '@/shared/api/axios';

export const fetchCeoDashboardData = async (filters: any) => {
  const { data } = await api.get('/dashboard/ceo-portal-summary', { params: filters });
  return data.data;
};
