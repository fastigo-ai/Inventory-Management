import { api } from "@/shared/api/axios";

export const getEntityMetadata = async (entityName: string) => {
  const response = await api.get(`/metadata/${entityName}`);
  const data = response.data.data;
  if (entityName === 'Vendor' && data?.fields) {
    data.fields = data.fields.map((f: any) => {
      if (f.name.toLowerCase() === 'tds' || f.name.toLowerCase() === 'tds_tcs' || f.label.includes('TDS')) {
        return { ...f, type: 'text', options: [] };
      }
      return f;
    });
  }
  return data; // Returns IMetadata
};

export const updateEntityMetadata = async (entityName: string, fields: any[]) => {
  const response = await api.put(`/metadata/${entityName}`, { fields });
  return response.data.data;
};

interface GetVendorsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
}

export const getVendors = async (params?: GetVendorsParams) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
  if (params?.search) query.append('search', params.search);
  if (params?.status) query.append('status', params.status);
  
  const queryString = query.toString();
  const url = queryString ? `/vendors?${queryString}` : '/vendors';

  const response = await api.get(url);
  return response.data.data;
};

export const getVendor = async (id: string) => {
  const response = await api.get(`/vendors/${id}`);
  return response.data.data;
};

export const createVendor = async (dynamicData: any) => {
  const response = await api.post('/vendors', { dynamicData });
  return response.data.data;
};

export const updateVendor = async (id: string, dynamicData: any) => {
  const response = await api.put(`/vendors/${id}`, { dynamicData });
  return response.data.data;
};

export const deleteVendor = async (id: string) => {
  const response = await api.delete(`/vendors/${id}`);
  return response.data.data;
};

export const exportVendorsToCsv = async () => {
  const response = await api.get('/vendors/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'vendors_export.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const exportVendorTemplateToCsv = async () => {
  const response = await api.get('/vendors/template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'vendors_template.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const importVendorsFromCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/vendors/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};
