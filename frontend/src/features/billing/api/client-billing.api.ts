import { api } from '@/shared/api/axios';

export const getClientBills = async () => {
  const response = await api.get('/client-billing');
  return response.data;
};

export const getClientBillById = async (id: string) => {
  const response = await api.get(`/client-billing/${id}`);
  return response.data;
};

export const createClientBill = async (data: FormData) => {
  const response = await api.post('/client-billing', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateClientBill = async (id: string, data: FormData) => {
  const response = await api.put(`/client-billing/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateClientBillStatus = async (id: string, data: { status: string, rejectionRemarks?: string }) => {
  const response = await api.patch(`/client-billing/${id}/status`, data);
  return response.data;
};
