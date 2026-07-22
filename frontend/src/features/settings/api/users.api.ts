import { api } from '@/shared/api/axios';

export const getUsers = async (params?: any) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const createUser = async (data: any) => {
  const response = await api.post('/users', data);
  return response.data;
};

export const updateUserRole = async (id: string, roleId: string) => {
  const response = await api.put(`/users/${id}/role`, { roleId });
  return response.data;
};
