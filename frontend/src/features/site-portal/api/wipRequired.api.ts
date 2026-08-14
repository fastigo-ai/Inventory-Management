import { api } from '@/shared/api/axios';

export const getWipRequireds = async () => {
  return api.get('/wip-required');
};

export const getWipRequiredById = async (id: string) => {
  return api.get(`/wip-required/${id}`);
};

export const createWipRequired = async (data: any) => {
  return api.post('/wip-required', data);
};

export const updateWipRequired = async (id: string, data: any) => {
  return api.put(`/wip-required/${id}`, data);
};

export const deleteWipRequired = async (id: string) => {
  return api.delete(`/wip-required/${id}`);
};

export const uploadWipRequiredExcel = async (formData: FormData) => {
  const response = await api.post('/wip-required/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
