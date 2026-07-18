import { api } from "@/shared/api/axios";

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (payload: any) => {
  const response = await api.post('/users', payload);
  return response.data;
};

export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};
