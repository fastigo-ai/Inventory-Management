import { Request, Response } from 'express';
import AuditLog, { AuditAction } from './auditLog.model';
import { translateAuditField } from '../../core/utils/auditDictionary';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import mongoose from 'mongoose';
import AuditSettings from './auditSettings.model';
import { refreshAuditSettingsCache } from '../../core/plugins/auditCache';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId, action, userId, search, startDate, endDate, page: pageQuery, limit: limitQuery } = req.query;
  const page = parseInt(pageQuery as string) || 1;
  const limit = parseInt(limitQuery as string) || 50;

  const query: any = {};

  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  
  if (action) {
    if (Array.isArray(action)) {
      query.action = { $in: action };
    } else if (typeof action === 'string' && action.includes(',')) {
      query.action = { $in: action.split(',') };
    } else {
      query.action = action;
    }
  }
  
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

  // Map display fields
  let formattedLogs = result.map(log => {
    const logObj = log.toObject ? log.toObject() : log;
    if (logObj.changes && Array.isArray(logObj.changes)) {
      logObj.changes = logObj.changes.map((change: any) => ({
        ...change,
        displayField: translateAuditField(change.field)
      }));
    }
    return logObj;
  });

  // Resolve human-readable entity displays
  try {
    const toFetch: Record<string, Set<string>> = {};
    for (const log of formattedLogs) {
      if (!log.entityId || !log.entityType) continue;
      const type = log.entityType.toLowerCase();
      let modelName = '';
      if (type.includes('demand note') || type === 'demandnote') modelName = 'DemandNote';
      else if (type.includes('ho billing') || type.includes('work order') || type === 'contractorworkorder') modelName = 'ContractorWorkOrder';
      else if (type.includes('purchase order')) modelName = 'PurchaseOrder';
      else if (type.includes('di') || type === 'dispatchinstruction') modelName = 'DispatchInstruction';
      else if (type.includes('jmc')) modelName = 'JmcRegister';
      else if (type.includes('mhrov')) modelName = 'Mhrov';
      else if (type.includes('wip required') || type === 'wiprequired') modelName = 'WipRequired';
      else if (type.includes('wip consumed') || type === 'wipconsumed') modelName = 'WipConsumed';
      else if (type.includes('contractor') && !type.includes('work') && !type.includes('billing')) modelName = 'Contractor';
      else if (type.includes('item')) modelName = 'Item';
      else if (type.includes('user')) modelName = 'User';
      
      if (modelName) {
        if (!toFetch[modelName]) toFetch[modelName] = new Set();
        toFetch[modelName].add(log.entityId.toString());
      }
    }

    const displayMap: Record<string, string> = {};
    const promises = Object.entries(toFetch).map(async ([modelName, ids]) => {
      if (!mongoose.models[modelName]) return;
      try {
        const Model = mongoose.models[modelName];
        let displayField = '';
        if (modelName === 'DemandNote') displayField = 'demandNoteNumber';
        else if (modelName === 'ContractorWorkOrder') displayField = 'workOrderNumber';
        else if (modelName === 'PurchaseOrder') displayField = 'orderNumber';
        else if (modelName === 'DispatchInstruction') displayField = 'diNumber';
        else if (modelName === 'JmcRegister') displayField = 'jmcNumber';
        else if (modelName === 'Mhrov') displayField = 'mhrovNumber';
        else if (modelName === 'WipRequired') displayField = 'wipReqNumber';
        else if (modelName === 'WipConsumed') displayField = 'wipConNumber';
        else if (modelName === 'Contractor') displayField = 'dynamicData.contractorName';
        else if (modelName === 'Item') displayField = 'itemName';
        else if (modelName === 'User') displayField = 'email';
        else return;

        const docs = await Model.find({ _id: { $in: Array.from(ids) } }).select(displayField).lean();
        for (const doc of docs as any[]) {
          const val = displayField.split('.').reduce((o: any, i: string) => o?.[i], doc);
          if (val) displayMap[doc._id.toString()] = String(val);
        }
      } catch (e) {}
    });

    await Promise.all(promises);

    formattedLogs = formattedLogs.map(log => {
      if (log.entityId && displayMap[log.entityId.toString()]) {
        log.entityDisplay = displayMap[log.entityId.toString()];
      }
      return log;
    });
  } catch (err) {
    console.error('Error resolving entity displays:', err);
  }

  res.status(200).json(new ApiResponse(200, {
    logs: formattedLogs,
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

/**
 * GET /api/audit/settings
 * Fetches all audit settings and merges them with all registered Mongoose models.
 */
export const getAuditSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await AuditSettings.find({}).lean();
  
  // Get all registered models in the system
  const modelNames = mongoose.modelNames().sort();
  
  const mergedSettings = modelNames.map(modelName => {
    const existing = settings.find(s => s.entityName === modelName);
    return existing || {
      entityName: modelName,
      isActive: false, // Default unconfigured models to false
      trackAllFields: true,
      trackedFields: [],
      ignoredFields: [],
    };
  });

  res.status(200).json(new ApiResponse(200, mergedSettings, 'Audit settings fetched successfully'));
});

/**
 * PUT /api/audit/settings/:entityName
 * Upserts audit settings for a specific entity and refreshes the cache.
 */
export const updateAuditSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { entityName } = req.params;
  const { isActive, trackAllFields, trackedFields, ignoredFields } = req.body;

  const updated = await AuditSettings.findOneAndUpdate(
    { entityName },
    { isActive, trackAllFields, trackedFields, ignoredFields },
    { new: true, upsert: true } // Create if doesn't exist
  );

  // Refresh the in-memory cache so the plugin picks it up immediately
  await refreshAuditSettingsCache();

  res.status(200).json(new ApiResponse(200, updated, 'Audit settings updated successfully'));
});
