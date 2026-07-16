import { api } from "@/shared/api/axios";

export interface CreateLocationDto {
  name: string;
  parentLocation?: string;
  type: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  status: string;
}

export const createLocation = async (data: CreateLocationDto) => {
  const response = await api.post('/locations', data);
  return response.data;
};

export const getLocations = async () => {
  const response = await api.get('/locations');
  return response.data;
};

export const updateLocation = async (id: string, data: Partial<CreateLocationDto>) => {
  const response = await api.put(`/locations/${id}`, data);
  return response.data;
};

export const deleteLocation = async (id: string) => {
  const response = await api.delete(`/locations/${id}`);
  return response.data;
};
