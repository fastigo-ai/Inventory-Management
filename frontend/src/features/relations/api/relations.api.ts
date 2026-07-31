import { api } from "@/shared/api/axios";

export const getDocumentRelations = async (documentId: string) => {
  try {
    const response = await api.get(`/relations/${documentId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching document relations:", error);
    throw error;
  }
};
