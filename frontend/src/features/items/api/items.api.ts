import { api } from "@/shared/api/axios";

export const getEntityMetadata = async (entityName: string) => {
  const response = await api.get(`/metadata/${entityName}`);
  return response.data.data; // Returns IMetadata
};

export const updateEntityMetadata = async (entityName: string, fields: any[]) => {
  const response = await api.put(`/metadata/${entityName}`, { fields });
  return response.data.data;
};

export const getItems = async (params: { page?: number, limit?: number, sortBy?: string, sortOrder?: string, isDeleted?: boolean, filters?: Record<string, string> } = {}) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
  if (params?.isDeleted !== undefined) query.append('isDeleted', params.isDeleted.toString());
  
  if (params?.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value) query.append(`filter_${key}`, value);
    });
  }
  
  const queryString = query.toString();
  const url = queryString ? `/items?${queryString}` : '/items';

  const response = await api.get(url);
  return response.data.data;
};

export const getItem = async (id: string) => {
  const response = await api.get(`/items/${id}`);
  return response.data.data;
};

export const getItemUsage = async (id: string) => {
  const response = await api.get(`/items/${id}/usage`);
  return response.data.data;
};

export const createItem = async (dynamicData: any) => {
  const response = await api.post('/items', { dynamicData });
  return response.data.data;
};

export const updateItem = async (id: string, dynamicData: any) => {
  const response = await api.put(`/items/${id}`, { dynamicData });
  return response.data.data;
};

export const bulkDeleteItems = async (ids: string[]) => {
  const response = await api.post('/items/bulk-delete', { ids });
  return response.data;
};

export const exportItemsToCsv = async () => {
  const response = await api.get('/items/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'items_export.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const importItemsFromCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/items/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};
