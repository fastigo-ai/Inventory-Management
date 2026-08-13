import { api } from '@/shared/api/axios';

export const getWips = async () => {
  return api.get('/wip');
};

export const getWipById = async (id: string) => {
  return api.get(`/wip/${id}`);
};

export const createWip = async (data: any) => {
  return api.post('/wip', data);
};

export const updateWip = async (id: string, data: any) => {
  return api.put(`/wip/${id}`, data);
};

export const deleteWip = async (id: string) => {
  return api.delete(`/wip/${id}`);
};

export const uploadWipExcel = async (formData: FormData, onUploadProgress?: (progressEvent: any) => void) => {
  const response = await api.post('/wip/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};
