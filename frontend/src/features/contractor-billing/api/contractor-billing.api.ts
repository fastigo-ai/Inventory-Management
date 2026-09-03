import { api } from '@/shared/api/axios';

// Billing Invoices API
export const getContractorInvoices = async () => {
  const response = await api.get('/contractor-billing/invoices');
  return response.data;
};

export const getContractorInvoiceById = async (id: string) => {
  const response = await api.get(`/contractor-billing/invoices/${id}`);
  return response.data;
};

export const createContractorInvoice = async (payload: any) => {
  const response = await api.post('/contractor-billing/invoices', payload);
  return response.data;
};

export const updateInvoiceStatus = async (id: string, payload: { status: string; remarks?: string }) => {
  const response = await api.patch(`/contractor-billing/invoices/${id}/status`, payload);
  return response.data;
};

// Handover Certificates API
export const getHandoverCertificates = async () => {
  const response = await api.get('/contractor-billing/handover-certificates');
  return response.data;
};

export const getHandoverCertificateById = async (id: string) => {
  const response = await api.get(`/contractor-billing/handover-certificates/${id}`);
  return response.data;
};

export const createHandoverCertificate = async (payload: any) => {
  const response = await api.post('/contractor-billing/handover-certificates', payload);
  return response.data;
};

export const updateHandoverCertificate = async (id: string, payload: any) => {
  const response = await api.put(`/contractor-billing/handover-certificates/${id}`, payload);
  return response.data;
};

export const getBillingAnalytics = async () => {
  const response = await api.get('/contractor-billing/analytics');
  return response.data;
};
