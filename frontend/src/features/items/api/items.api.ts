import { api } from "@/shared/api/axios";

export const getEntityMetadata = async (entityName: string) => {
  const response = await api.get(`/metadata/${entityName}`);
  return response.data.data; // Returns IMetadata
};

export const updateEntityMetadata = async (entityName: string, fields: any[]) => {
  const response = await api.put(`/metadata/${entityName}`, { fields });
  return response.data.data;
};

interface GetItemsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const getItems = async (params?: GetItemsParams) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
  
  const queryString = query.toString();
  const url = queryString ? `/items?${queryString}` : '/items';

  const response = await api.get(url);
  return response.data.data;
};

export const createItem = async (dynamicData: any) => {
  const response = await api.post('/items', { dynamicData });
  return response.data.data;
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
