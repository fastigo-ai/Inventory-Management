import { api } from '@/shared/api/axios';

export const getSiteContractorSummary = async (params: { contractorId: string; package?: string; circle?: string }) => {
  const response = await api.get('/reports/site-contractor-summary', { params });
  return response.data;
};
