import { api } from './axios';

export const IntegrationsAPI = {
  fetchGstDetails: async (gstin: string) => {
    try {
      const response = await api.get(`/integrations/gst/${gstin}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }
};
