import { api } from '@/shared/api/axios';

export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};

export const createRole = async (data: { name: string; description?: string; permissions: string[] }) => {
  const response = await api.post('/roles', data);
  return response.data;
};

export const updateRole = async (id: string, data: { name?: string; description?: string; permissions?: string[] }) => {
  const response = await api.put(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};
