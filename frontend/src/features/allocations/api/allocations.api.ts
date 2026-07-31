import { api } from "@/shared/api/axios";

export const getDocumentAllocation = async (sourceId: string, moduleType: string = 'DI', excludePiId?: string) => {
  try {
    let url = `/allocations/${sourceId}?moduleType=${moduleType}`;
    if (excludePiId) {
      url += `&excludePiId=${excludePiId}`;
    }
    const response = await api.get(url);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching allocation:", error);
    throw error;
  }
};
