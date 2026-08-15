import { api } from '@/shared/api/axios';

export interface ItemSummaryFilter {
  circle?: string;
  package?: string;
  itemName?: string;
  description?: string;
  loaSerialNo?: string;
  tempCode?: string;
  companyId?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}

export const getItemSummaries = async (filters: ItemSummaryFilter) => {
  const { data } = await api.get('/reports/item-summary', { params: filters });
  return data;
};

export interface StoreItemisedFilter {
  circle?: string;
  store?: string;
  package?: string;
  search?: string;
  hideZeroBalance?: boolean;
  viewMode?: 'item' | 'loa';
  page?: number;
  limit?: number;
}

export const getStoreItemisedSummary = async (filters: StoreItemisedFilter) => {
  const { data } = await api.get('/reports/store-itemised-summary', { params: filters });
  return data;
};

export const exportStoreItemisedSummary = async (filters: StoreItemisedFilter) => {
  const res = await api.get('/reports/store-itemised-summary/export', {
    params: filters,
    responseType: 'blob'
  });
  return res.data;
};

