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

export const getItemMatrixSummary = async (params: {
  package?: string;
  circle?: string;
  targetCircle?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { data } = await api.get('/reports/item-matrix-summary', { params });
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

export interface StoreContractorFilter {
  contractorName?: string;
  circle?: string;
  package?: string;
  search?: string;
  hideZero?: boolean;
  page?: number;
  limit?: number;
}

export const getStoreContractorSummary = async (filters: StoreContractorFilter) => {
  const { data } = await api.get('/reports/store-contractor-summary', { params: filters });
  return data;
};

