import mongoose, { Schema } from 'mongoose';
import AuditLog, { AuditAction, IAuditChange } from '../../modules/audit/auditLog.model';
import { getContext } from '../utils/context';
import { getAuditSettingsForEntity } from './auditCache';

export interface AuditPluginOptions {
  entityName?: string; // Optional now, since we can infer it
  ignoredFields?: string[];
  track?: boolean; // Can override global settings
}

const defaultIgnoredFields = ['updatedAt', 'createdAt', '__v', 'password', 'passwordHash', 'refreshToken', 'loginTime', 'lastSeen'];

// Helper to determine deep equality
const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

// Helper to resolve entity name from document or query
const getEntityName = (docOrQuery: any, options: AuditPluginOptions): string => {
  if (options?.entityName) return options.entityName;
  if (docOrQuery?.constructor?.modelName) return docOrQuery.constructor.modelName;
  if (docOrQuery?.model?.modelName) return docOrQuery.model.modelName;
  return 'UnknownEntity';
};

// Helper to determine if a field should be tracked based on dynamic settings
const shouldTrackField = (field: string, entityName: string, options: AuditPluginOptions): boolean => {
  const settings = getAuditSettingsForEntity(entityName);
  
  // If no dynamic settings yet, fallback to default behavior (track all except default ignored)
  if (!settings) {
    const ignored = [...defaultIgnoredFields, ...(options.ignoredFields || [])];
    return !ignored.includes(field) && field !== '_id';
  }

  // If we have settings, check if the entity is active at all
  if (!settings.isActive) return false;
  if (field === '_id') return false;

  const alwaysIgnore = ['password', 'passwordHash', 'refreshToken', '__v'];
  if (alwaysIgnore.includes(field)) return false;

  if (settings.trackAllFields) {
    // Track everything EXCEPT ignored fields
    return !settings.ignoredFields.includes(field);
  } else {
    // Track ONLY tracked fields
    return settings.trackedFields.includes(field);
  }
};

const isEntityTracked = (entityName: string, options: AuditPluginOptions): boolean => {
  if (options.track === false) return false; // Hard override
  
  const settings = getAuditSettingsForEntity(entityName);
  // If no DB config, track by default unless explicitly disabled in code (which is handled above)
  if (!settings) return true; 
  
  return settings.isActive;
};

export function auditPlugin(schema: Schema, options: AuditPluginOptions = {}) {
  const createLog = async (
    entityType: string,
    docId: any,
    action: AuditAction,
    changes: IAuditChange[],
    moduleName?: string
  ) => {
    if (changes.length === 0 && action === AuditAction.UPDATE) return; // Don't log empty updates

    const ctx = getContext();
    
    // Defaulting performedBy to null if system, or using context
    const performedBy = ctx?.userId ? new mongoose.Types.ObjectId(ctx.userId) : undefined;
    const companyId = ctx?.companyId ? new mongoose.Types.ObjectId(ctx.companyId) : undefined;
    const branchId = ctx?.branchId ? new mongoose.Types.ObjectId(ctx.branchId) : undefined;

    try {
      await AuditLog.create({
        companyId,
        branchId,
        entityType,
        entityId: docId,
        action,
        module: moduleName || entityType,
        requestId: ctx?.requestId,
        performedBy,
        changes,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        device: ctx?.device,
        browser: ctx?.browser,
        os: ctx?.os,
        route: ctx?.route,
        method: ctx?.method,
      });
    } catch (err) {
      console.error(`Failed to create audit log for ${entityType} ${docId}`, err);
    }
  };

  // --- SAVE HOOKS ---
  schema.pre('save', async function (this: any) {
    const entityType = getEntityName(this, options);
    if (!isEntityTracked(entityType, options)) return;

    if (!this.isNew) {
      try {
        const original = await (this.constructor as any).findById(this._id).lean();
        this.$locals = this.$locals || {};
        this.$locals.original = original;
      } catch (err) {
        console.warn('Audit plugin could not fetch original document for diffing');
      }
    }
  });

  schema.post('save', async function (doc: any) {
    const entityType = getEntityName(doc, options);
    if (!isEntityTracked(entityType, options)) return;

    try {
      const action = doc.$locals?.original ? AuditAction.UPDATE : AuditAction.CREATE;
      const changes: IAuditChange[] = [];

      if (action === AuditAction.CREATE) {
        const obj: Record<string, any> = doc.toObject();
        for (const key of Object.keys(obj)) {
          if (shouldTrackField(key, entityType, options)) {
            changes.push({ field: key, newValue: obj[key] });
          }
        }
      } else {
        const original: Record<string, any> = doc.$locals?.original || {};
        const current: Record<string, any> = doc.toObject();
        
        for (const key of Object.keys(current)) {
          if (!shouldTrackField(key, entityType, options)) continue;
          
          if (!isEqual(original[key], current[key])) {
            changes.push({
              field: key,
              oldValue: original[key],
              newValue: current[key]
            });
          }
        }
        
        for (const key of Object.keys(original)) {
          if (!shouldTrackField(key, entityType, options)) continue;
          if (current[key] === undefined && original[key] !== undefined) {
             changes.push({
               field: key,
               oldValue: original[key],
               newValue: null
             });
          }
        }
      }

      await createLog(entityType, doc._id, action, changes);
    } catch (err) {
      console.error('Audit plugin save error:', err);
    }
  });

  // --- FIND ONE AND UPDATE HOOKS ---
  schema.pre('findOneAndUpdate', async function (this: any) {
    const entityType = getEntityName(this, options);
    if (!isEntityTracked(entityType, options)) return;

    try {
      const docToUpdate = await this.model.findOne(this.getQuery()).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = docToUpdate;
    } catch (err) {
      console.warn('Audit plugin could not fetch original document for findOneAndUpdate');
    }
  });

  schema.post('findOneAndUpdate', async function (this: any, doc: any) {
    if (!doc) return;
    
    const entityType = getEntityName(this, options);
    if (!isEntityTracked(entityType, options)) return;
    
    try {
      const original: Record<string, any> = this.$locals?.original || {};
      const current: Record<string, any> = doc.toObject ? doc.toObject() : doc;
      const changes: IAuditChange[] = [];
      
      if (current.isDeleted === true && original.isDeleted !== true) {
        await createLog(entityType, doc._id, AuditAction.DELETE, [{ field: 'isDeleted', oldValue: false, newValue: true }]);
        return;
      }

      for (const key of Object.keys(current)) {
        if (!shouldTrackField(key, entityType, options)) continue;
        
        if (!isEqual(original[key], current[key])) {
          changes.push({
            field: key,
            oldValue: original[key],
            newValue: current[key]
          });
        }
      }

      for (const key of Object.keys(original)) {
        if (!shouldTrackField(key, entityType, options)) continue;
        if (current[key] === undefined && original[key] !== undefined) {
           changes.push({
             field: key,
             oldValue: original[key],
             newValue: null
           });
        }
      }

      await createLog(entityType, doc._id, AuditAction.UPDATE, changes);
    } catch (err) {
      console.error('Audit plugin findOneAndUpdate error:', err);
    }
  });
  
  // --- DELETE HOOKS ---
  schema.pre('findOneAndDelete', async function (this: any) {
    const entityType = getEntityName(this, options);
    if (!isEntityTracked(entityType, options)) return;

    try {
      const docToDelete = await this.model.findOne(this.getQuery()).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = docToDelete;
    } catch (err) {
      console.warn('Audit plugin error in findOneAndDelete');
    }
  });

  schema.post('findOneAndDelete', async function (this: any, doc: any) {
    if (!doc) return;
    const entityType = getEntityName(this, options);
    if (!isEntityTracked(entityType, options)) return;

    try {
      await createLog(entityType, doc._id, AuditAction.DELETE, []);
    } catch (err) {
      console.error('Audit plugin findOneAndDelete error:', err);
    }
  });
  
  // Update Many (Bulk Updates)
  schema.post('updateMany', async function (this: any, res: any) {
    const entityType = getEntityName(this, options);
    if (!isEntityTracked(entityType, options)) return;

    try {
       if (res.modifiedCount > 0) {
          const ctx = getContext();
          const performedBy = ctx?.userId ? new mongoose.Types.ObjectId(ctx.userId) : undefined;
          
          await AuditLog.create({
            entityType,
            entityId: new mongoose.Types.ObjectId(), // Dummy ID for bulk
            action: AuditAction.BULK_UPDATE,
            performedBy,
            changes: [{ field: 'bulk', message: `Bulk updated ${res.modifiedCount} records` }],
            requestId: ctx?.requestId,
            ip: ctx?.ip,
            userAgent: ctx?.userAgent
          });
       }
    } catch(err) {
      console.error(err);
    }
  });
}
