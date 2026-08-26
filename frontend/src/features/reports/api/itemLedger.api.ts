import { api } from '@/shared/api/axios';

export const getItemLedger = async (params: { tempCode?: string; itemName?: string; circle?: string; package?: string }) => {
  const response = await api.get('/reports/item-ledger', { params });
  return response.data.data;
};
