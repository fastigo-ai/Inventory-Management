import { api } from "@/shared/api/axios";

export interface CreateDIDto {
  diNumber: string;
  purchaseOrderId: string;
  date: Date | string;
  circle?: string;
  package?: string;
  lineItems: Array<{
    itemId?: string;
    itemName: string;
    tempCode?: string;
    package?: string;
    circle?: string;
    quantity: number;
  }>;
  notes?: string;
}

export const createDI = async (payload: CreateDIDto | FormData) => {
  const response = await api.post('/di', payload);
  return response.data;
};

export const updateDI = async (id: string, payload: CreateDIDto | FormData) => {
  const response = await api.put(`/di/${id}`, payload);
  return response.data;
};

export const getDIs = async () => {
  const response = await api.get('/di');
  return response.data;
};

export const getDIById = async (id: string) => {
  const response = await api.get(`/di/${id}`);
  return response.data.data;
};

export const updateDIStatus = async (id: string, status: string) => {
  const response = await api.patch(`/di/${id}/status`, { status });
  return response.data;
};

export const importDIsFromCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/di/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return response.data;
};
