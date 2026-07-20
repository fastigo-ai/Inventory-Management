import { api } from "@/shared/api/axios";

export interface GetAuditLogsParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export const getAuditLogs = async (params: GetAuditLogsParams) => {
  const query = new URLSearchParams();
  if (params.entityType) query.append('entityType', params.entityType);
  if (params.entityId) query.append('entityId', params.entityId);
  if (params.action) query.append('action', params.action);
  if (params.userId) query.append('userId', params.userId);
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString();
  const url = queryString ? `/audit?${queryString}` : '/audit';

  const response = await api.get(url);
  return response.data.data;
};
