import { Request, Response } from 'express';
import AuditLog from './auditLog.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId, action, userId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const query: any = {};
  
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (userId) query.performedBy = userId;
  
  // Multi-tenant check
  if (req.user?.companyId) {
    query.companyId = req.user.companyId;
  }
  
  const skip = (page - 1) * limit;
  
  const totalLogs = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .populate('performedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json(new ApiResponse(200, {
    logs,
    pagination: {
      total: totalLogs,
      page,
      limit,
      totalPages: Math.ceil(totalLogs / limit)
    }
  }, 'Audit logs fetched successfully'));
});
