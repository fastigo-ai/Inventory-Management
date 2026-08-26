import { api } from '@/shared/api/axios';

export interface AuditEvent {
  action: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  description?: string;
  page?: string;
  component?: string;
  label?: string;
  status?: 'success' | 'failed';
  metadata?: Record<string, any>;
  route?: string;
  timestamp?: string;
}

export const trackAuditEvents = async (events: AuditEvent[]) => {
  try {
    await api.post('/audit/track', { events });
  } catch {
    // silently fail — audit tracking should never break the UI
  }
};

export const getAuditLogs = async (params: {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.entityType) query.append('entityType', params.entityType);
  if (params.entityId) query.append('entityId', params.entityId);
  if (params.action) query.append('action', params.action);
  if (params.userId) query.append('userId', params.userId);
  if (params.search) query.append('search', params.search);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());

  const qs = query.toString();
  const response = await api.get(qs ? `/audit?${qs}` : '/audit');
  return response.data.data;
};
