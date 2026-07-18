import { api } from "@/shared/api/axios";

export const getContractors = async () => {
  const response = await api.get('/contractors');
  return response.data;
};

export const createContractor = async (payload: any) => {
  const response = await api.post('/contractors', payload);
  return response.data;
};

export const getAssignments = async () => {
  const response = await api.get('/contractors/assignments');
  return response.data;
};

export const createAssignment = async (payload: any) => {
  const response = await api.post('/contractors/assignments', payload);
  return response.data;
};
