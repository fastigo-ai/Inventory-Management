import { api } from "@/shared/api/axios";

export interface CreatePurchaseOrderDto {
  vendorName: string;
  location?: string;
  deliveryAddressType?: 'Locations' | 'Customer';
  deliveryAddressId?: string;
  purchaseOrderNumber: string;
  reference?: string;
  date: Date | string;
  deliveryDate?: Date | string;
  paymentTerms?: string;
  poQuantity?: string;
  circle?: string;
  package1?: string;
  package2?: string;
  shipmentPreference?: string;
  warehouseLocation?: string;
  lineItems: Array<{
    itemId?: string;
    itemName: string;
    tempCode?: string;
    account?: string;
    quantity: number;
    rate: number;
  }>;
  notes?: string;
  termsConditions?: string;
  discountPercentage?: number;
  taxType?: 'TDS' | 'TCS';
  taxPercentage?: number;
  adjustment?: number;
  status?: 'Draft' | 'Sent';
}

export const createPurchaseOrder = async (payload: CreatePurchaseOrderDto | FormData) => {
  const isFormData = payload instanceof FormData;
  const response = await api.post('/purchases/orders', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const updatePurchaseOrder = async (id: string, payload: CreatePurchaseOrderDto | FormData) => {
  const isFormData = payload instanceof FormData;
  const response = await api.put(`/purchases/orders/${id}`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const getPurchaseOrders = async () => {
  const response = await api.get('/purchases/orders');
  return response.data;
};

export const getPurchaseOrderById = async (id: string) => {
  const response = await api.get(`/purchases/orders/${id}`);
  return response.data.data;
};

export const exportPurchaseOrdersToCsv = async () => {
  const response = await api.get('/purchases/orders/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'purchase_orders_export.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const importPurchaseOrdersFromCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/purchases/orders/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getNextPurchaseOrderNumber = async () => {
  const response = await api.get('/purchases/orders/next-number');
  return response.data;
};

// Purchase Receives
export interface CreatePurchaseReceiveDto {
  vendorName: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  purchaseReceiveNumber: string;
  receiveDate: string | Date;
  diNo?: string;
  diDate?: string | Date;
  packageName?: string;
  package1?: string;
  package2?: string;
  loaSerialNo?: string;
  sku?: string;
  itemName?: string;
  unit?: string;
  quantity?: number;
  lineItems: Array<{
    itemId?: string;
    itemName: string;
    tempCode?: string;
    ordered: number;
    received: number;
    inTransit: number;
    quantityToReceive: number;
  }>;
  notes?: string;
  status?: 'Draft' | 'Received' | 'In Transit';
  billed?: boolean;
}

export const createPurchaseReceive = async (payload: CreatePurchaseReceiveDto | FormData) => {
  const isFormData = payload instanceof FormData;
  const response = await api.post('/purchases/receives', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const getPurchaseReceives = async (params?: { page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  
  const queryString = query.toString();
  const url = queryString ? `/purchases/receives?${queryString}` : '/purchases/receives';
  
  const response = await api.get(url);
  return response.data;
};

export const getPurchaseReceiveById = async (id: string) => {
  const response = await api.get(`/purchases/receives/${id}`);
  return response.data.data;
};

export const updatePurchaseReceive = async (id: string, data: any) => {
  const response = await api.put(`/purchases/receives/${id}`, data);
  return response.data;
};

export const deletePurchaseReceive = async (id: string) => {
  const response = await api.delete(`/purchases/receives/${id}`);
  return response.data;
};

export const getNextPurchaseReceiveNumber = async () => {
  const response = await api.get('/purchases/receives/next-number');
  return response.data;
};
