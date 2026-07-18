import { api } from '@/shared/api/axios';

export const getBillingCompanies = async () => {
  const response = await api.get('/billing-companies');
  return response.data;
};

export const createBillingCompany = async (formData: FormData) => {
  const response = await api.post('/billing-companies', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateBillingCompany = async (id: string, formData: FormData) => {
  const response = await api.put(`/billing-companies/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteBillingCompany = async (id: string) => {
  const response = await api.delete(`/billing-companies/${id}`);
  return response.data;
};
