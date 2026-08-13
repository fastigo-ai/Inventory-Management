import { api } from '@/shared/api/axios';

export const getJmcs = async () => {
  return api.get('/jmc');
};

export const getJmcById = async (id: string) => {
  return api.get(`/jmc/${id}`);
};

export const createJmc = async (data: any) => {
  return api.post('/jmc', data);
};

export const updateJmc = async (id: string, data: any) => {
  return api.put(`/jmc/${id}`, data);
};

export const deleteJmc = async (id: string) => {
  return api.delete(`/jmc/${id}`);
};

export const uploadJmcExcel = async (formData: FormData, onUploadProgress?: (progressEvent: any) => void) => {
  const response = await api.post('/jmc/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return response.data;
};
