import { api } from "@/shared/api/axios";

export const getContractors = async (location?: string, search?: string, page?: number, limit?: number) => {
  let url = '/contractors?';
  if (location) url += `location=${encodeURIComponent(location)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (page) url += `page=${page}&`;
  if (limit) url += `limit=${limit}&`;
  const response = await api.get(url);
  return response.data;
};

export const getContractor = async (id: string) => {
  const response = await api.get(`/contractors/${id}`);
  return response.data;
};

export const exportContractorTemplate = async () => {
  const response = await api.get('/contractors/template', { responseType: 'blob' });
  return response.data;
};

export const importContractors = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/contractors/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000 // 2 minutes for bulk import
  });
  return response.data;
};

export const importContractorAssignments = async (file: File, onUploadProgress?: (progressEvent: any) => void) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/contractors/assignments/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 minutes for bulk import
    onUploadProgress
  });
  return response.data;
};

export const createContractor = async (payload: any) => {
  const response = await api.post('/contractors', payload);
  return response.data;
};

export const updateContractor = async (id: string, payload: any) => {
  const response = await api.put(`/contractors/${id}`, payload);
  return response.data;
};

export const deleteContractor = async (id: string) => {
  const response = await api.delete(`/contractors/${id}`);
  return response.data;
};

export const getContractorTransactions = async (id: string) => {
  const response = await api.get(`/contractors/${id}/transactions`);
  return response.data.data;
};

export const assignContractorLocations = async (id: string, locations: string[]) => {
  const response = await api.patch(`/contractors/${id}/assign`, { locations });
  return response.data;
};

export const getAssignments = async (contractorId?: string) => {
  const url = contractorId ? `/contractors/assignments?contractorId=${contractorId}` : '/contractors/assignments';
  const response = await api.get(url);
  return response.data;
};

export const getAssignmentById = async (id: string) => {
  const response = await api.get(`/contractors/assignments/${id}`);
  return response.data;
};

export const createAssignment = async (payload: any) => {
  const response = await api.post('/contractors/assignments', payload);
  return response.data;
};

export const updateAssignment = async (id: string, payload: any) => {
  const response = await api.put(`/contractors/assignments/${id}`, payload);
  return response.data;
};

export const cancelAssignment = async (id: string) => {
  const response = await api.patch(`/contractors/assignments/${id}/cancel`);
  return response.data;
};

export const getContractorReturns = async (contractorId?: string) => {
  const url = contractorId ? `/contractors/returns?contractorId=${contractorId}` : '/contractors/returns';
  const response = await api.get(url);
  return response.data;
};

export const createContractorReturn = async (payload: any) => {
  const response = await api.post('/contractors/returns', payload);
  return response.data;
};

export const getContractorReturnById = async (id: string) => {
  const response = await api.get(`/contractors/returns/${id}`);
  return response.data;
};

export const updateContractorReturn = async (id: string, payload: any) => {
  const response = await api.put(`/contractors/returns/${id}`, payload);
  return response.data;
};

export const deleteContractorReturn = async (id: string) => {
  const response = await api.delete(`/contractors/returns/${id}`);
  return response.data;
};

export const importContractorReturns = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/contractors/returns/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
