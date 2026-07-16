import { api } from "@/shared/api/axios";

export const getEntityMetadata = async (entityName: string) => {
  const response = await api.get(`/metadata/${entityName}`);
  return response.data.data; // Returns IMetadata
};

export const getItems = async () => {
  const response = await api.get('/items');
  return response.data.data;
};

export const createItem = async (dynamicData: any) => {
  const response = await api.post('/items', { dynamicData });
  return response.data.data;
};
