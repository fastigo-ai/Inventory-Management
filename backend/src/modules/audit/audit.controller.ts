import { Request, Response } from 'express';
import AuditLog, { AuditAction } from './auditLog.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import mongoose from 'mongoose';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId, action, userId, search, startDate, endDate, page: pageQuery, limit: limitQuery } = req.query;
  const page = parseInt(pageQuery as string) || 1;
  const limit = parseInt(limitQuery as string) || 50;

  const query: any = {};

  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (userId) query.performedBy = userId;

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const totalLogs = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .populate({
      path: 'performedBy',
      select: 'firstName lastName email role',
      populate: {
        path: 'role',
        select: 'name'
      }
    })
    .sort({ createdAt: -1 }) // newest first
    .skip(skip)
    .limit(limit);

  // If search is provided, filter by user name in-memory (post-populate)
  let result = logs as any[];
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(log => {
      const fullName = `${log.performedBy?.firstName || ''} ${log.performedBy?.lastName || ''}`.toLowerCase();
      const desc = (log.description || '').toLowerCase();
      const module = (log.module || log.entityType || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const label = (log.label || '').toLowerCase();
      const page = (log.page || '').toLowerCase();
      return fullName.includes(q) || desc.includes(q) || module.includes(q) || action.includes(q) || label.includes(q) || page.includes(q);
    });
  }

  res.status(200).json(new ApiResponse(200, {
    logs: result,
    pagination: {
      total: totalLogs,
      page,
      limit,
      totalPages: Math.ceil(totalLogs / limit)
    }
  }, 'Audit logs fetched successfully'));
});

/**
 * POST /api/audit/track
 * Receives batched frontend events and persists them to AuditLog.
 */
export const trackEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    res.status(200).json(new ApiResponse(200, {}, 'No events to track'));
    return;
  }

  const userId = user?._id ? new mongoose.Types.ObjectId(user._id) : undefined;

  // Cap at 50 events per batch to prevent abuse
  const batch = events.slice(0, 50);

  const docs = batch.map((evt: any) => ({
    performedBy: userId,
    entityType: evt.entityType || 'UI',
    entityId: evt.entityId ? new mongoose.Types.ObjectId(evt.entityId) : undefined,
    action: Object.values(AuditAction).includes(evt.action) ? evt.action : AuditAction.CLICK,
    module: evt.module || evt.page || 'UI',
    description: evt.description,
    page: evt.page,
    component: evt.component,
    label: evt.label,
    status: evt.status,
    metadata: evt.metadata,
    route: evt.route,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    createdAt: evt.timestamp ? new Date(evt.timestamp) : new Date(),
  }));

  await AuditLog.insertMany(docs, { ordered: false });

  res.status(200).json(new ApiResponse(200, { tracked: docs.length }, 'Events tracked'));
});

/**
 * Utility: create a single audit log from within another controller
 */
export const createAuditLog = async (params: {
  userId?: string;
  entityType: string;
  entityId?: string;
  action: AuditAction;
  module?: string;
  description?: string;
  changes?: { field: string; oldValue?: any; newValue?: any; message?: string }[];
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}) => {
  try {
    await AuditLog.create({
      performedBy: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
      entityType: params.entityType,
      entityId: params.entityId ? new mongoose.Types.ObjectId(params.entityId) : undefined,
      action: params.action,
      module: params.module || params.entityType,
      description: params.description,
      changes: params.changes,
      metadata: params.metadata,
      ip: params.ip,
      userAgent: params.userAgent,
    });
  } catch (err) {
    console.error('createAuditLog error:', err);
  }
};
