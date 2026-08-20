import { api } from "@/shared/api/axios";

export const getDemandNotes = async () => {
  const response = await api.get('/demand-notes');
  return response.data;
};

export const getDemandNoteById = async (id: string) => {
  const response = await api.get(`/demand-notes/${id}`);
  return response.data;
};

export const createDemandNote = async (data: any) => {
  const isFormData = data instanceof FormData;
  const response = await api.post('/demand-notes', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const updateDemandNote = async (id: string, data: any) => {
  const response = await api.put(`/demand-notes/${id}`, data);
  return response.data;
};

export const deleteDemandNote = async (id: string) => {
  const response = await api.delete(`/demand-notes/${id}`);
  return response.data;
};

export const getContextData = async (itemId: string, contractorId?: string, contractorName?: string, activity?: string, description?: string, tempCode?: string) => {
  let url = `/demand-notes/context?itemId=${itemId}`;
  if (contractorId) url += `&contractorId=${encodeURIComponent(contractorId)}`;
  if (contractorName) url += `&contractorName=${encodeURIComponent(contractorName)}`;
  if (activity) url += `&activity=${encodeURIComponent(activity)}`;
  if (description) url += `&description=${encodeURIComponent(description)}`;
  if (tempCode) url += `&tempCode=${encodeURIComponent(tempCode)}`;
  const response = await api.get(url);
  return response.data;
};
