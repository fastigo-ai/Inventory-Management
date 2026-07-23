import { api } from '@/shared/api/axios';

export interface ItemSummaryFilter {
  circle?: string;
  package?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

export const getItemSummaries = async (filters: ItemSummaryFilter) => {
  const { data } = await api.get('/reports/item-summary', { params: filters });
  return data;
};
