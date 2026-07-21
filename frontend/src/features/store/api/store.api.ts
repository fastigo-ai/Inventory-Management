import { api } from "@/shared/api/axios";

export const getPendingDIs = async () => {
  const response = await api.get('/store/di/pending');
  return response.data;
};

export const getDIPrefillData = async (diId: string) => {
  const response = await api.get(`/store/di/${diId}/prefill`);
  return response.data;
};

export const createInwardEntry = async (data: any) => {
  const response = await api.post('/store/inventory/inward', data);
  return response.data;
};

export const updateInwardEntry = async (id: string, data: any) => {
  const response = await api.put(`/store/inventory/inward/${id}`, data);
  return response.data;
};

export const getInwardEntryById = async (id: string) => {
  const response = await api.get(`/store/inventory/inward/${id}`);
  return response.data;
};

export const queryInwardEntries = async (params: any) => {
  const response = await api.get('/store/inventory/inward', { params });
  return response.data;
};

export const getAdminInwardEntries = async (params: any) => {
  const response = await api.get('/store/admin/inventory/store-manager', { params });
  return response.data;
};

export const getStockSummary = async (params: any) => {
  const response = await api.get('/store/inventory/stock-summary', { params });
  return response.data;
};

export const getAdminStockSummary = async (params: any) => {
  const response = await api.get('/store/admin/inventory/stock-summary', { params });
  return response.data;
};
