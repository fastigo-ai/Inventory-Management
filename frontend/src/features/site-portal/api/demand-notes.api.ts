import api from '@/core/api';

export const getDemandNotes = async () => {
  const response = await api.get('/demand-notes');
  return response.data;
};

export const getDemandNoteById = async (id: string) => {
  const response = await api.get(`/demand-notes/${id}`);
  return response.data;
};

export const createDemandNote = async (data: any) => {
  const response = await api.post('/demand-notes', data);
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

export const getContextData = async (itemId: string) => {
  const response = await api.get(`/demand-notes/context?itemId=${itemId}`);
  return response.data;
};
