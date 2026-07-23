import { api } from "@/shared/api/axios";

export const getContractors = async (location?: string) => {
  const url = location ? `/contractors?location=${encodeURIComponent(location)}` : '/contractors';
  const response = await api.get(url);
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

export const assignContractorLocations = async (id: string, locations: string[]) => {
  const response = await api.patch(`/contractors/${id}/assign`, { locations });
  return response.data;
};
