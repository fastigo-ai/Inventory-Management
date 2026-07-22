import { api } from "@/shared/api/axios";

export const getPendingDIs = async () => {
  const response = await api.get('/store/di/pending');
  return response.data;
};

export const getDIPrefillData = async (diId: string) => {
  const response = await api.get(`/store/di/${diId}/prefill`);
  return response.data;
};

export const getPurchaseInvoicePrefillData = async (invoiceId: string) => {
  const response = await api.get(`/store/pi/${invoiceId}/prefill`);
  return response.data;
};

export const getPendingStoreReceipts = async () => {
  const response = await api.get('/store/receipts/pending');
  return response.data;
};

export const approveStoreReceipt = async (id: string) => {
  const response = await api.put(`/store/receipts/${id}/approve`);
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

// -- Inter-Store Transfers --

export const createStoreTransfer = async (data: any) => {
  const response = await api.post('/store/transfers', data);
  return response.data;
};

export const getStoreTransfers = async (params?: any) => {
  const response = await api.get('/store/transfers', { params });
  return response.data;
};

export const getStoreTransferById = async (id: string) => {
  const response = await api.get(`/store/transfers/${id}`);
  return response.data;
};

export const updateStoreTransferStatus = async (id: string, status: string) => {
  const response = await api.put(`/store/transfers/${id}/status`, { status });
  return response.data;
};

export const receiveStoreTransfer = async (id: string, data: any) => {
  const response = await api.put(`/store/transfers/${id}/receive`, data);
  return response.data;
};
export const dispatchStoreTransfer = async (id: string, data: any) => {
  const response = await api.put(`/store/transfers/${id}/dispatch`, data);
  return response.data;
};

export const importInwardRegistrations = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/inventory/inward/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
