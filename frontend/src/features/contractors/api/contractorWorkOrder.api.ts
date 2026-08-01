import { api } from '@/shared/api/axios';

export const createContractorWorkOrder = async (payload: any) => {
  const response = await api.post('/ho-billing/contractor-work-orders', payload);
  return response.data;
};

export const getContractorWorkOrders = async (params?: any) => {
  const response = await api.get('/ho-billing/contractor-work-orders', { params });
  return response.data;
};

export const getContractorWorkOrderById = async (id: string) => {
  const response = await api.get(`/ho-billing/contractor-work-orders/${id}`);
  return response.data;
};

export const importContractorWorkOrders = async (data: any[]) => {
  const response = await api.post('/ho-billing/contractor-work-orders/bulk-import', { data });
  return response.data;
};

export const updateContractorWorkOrderStatus = async (id: string, status: string) => {
  const response = await api.patch(`/ho-billing/contractor-work-orders/${id}/status`, { status });
  return response.data;
};
