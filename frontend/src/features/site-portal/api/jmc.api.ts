import { axiosInstance } from '@/shared/api/axios';

export const getJmcs = async () => {
  return axiosInstance.get('/jmc');
};

export const getJmcById = async (id: string) => {
  return axiosInstance.get(`/jmc/${id}`);
};

export const createJmc = async (data: any) => {
  return axiosInstance.post('/jmc', data);
};

export const updateJmc = async (id: string, data: any) => {
  return axiosInstance.put(`/jmc/${id}`, data);
};

export const deleteJmc = async (id: string) => {
  return axiosInstance.delete(`/jmc/${id}`);
};
