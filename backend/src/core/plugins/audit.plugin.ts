import mongoose, { Schema } from 'mongoose';
import AuditLog, { AuditAction, IAuditChange } from '../../modules/audit/auditLog.model';
import { getContext } from '../utils/context';

export interface AuditPluginOptions {
  entityName: string;
  ignoredFields?: string[];
  track?: boolean;
}

const defaultIgnoredFields = ['updatedAt', 'createdAt', '__v', 'password', 'passwordHash', 'refreshToken', 'loginTime', 'lastSeen'];

// Helper to determine deep equality
const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

export function auditPlugin(schema: Schema, options: AuditPluginOptions) {
  if (options.track === false) return;

  const entityType = options.entityName;
  const ignoredFields = [...defaultIgnoredFields, ...(options.ignoredFields || [])];

  const createLog = async (
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
  schema.pre('save', async function (next) {
    if (!this.isNew) {
      try {
        const original = await (this.constructor as any).findById(this._id).lean();
        this.$locals.original = original;
      } catch (err) {
        console.warn('Audit plugin could not fetch original document for diffing');
      }
    }
    next();
  });

  schema.post('save', async function (doc, next) {
    try {
      const action = doc.$locals.original ? AuditAction.UPDATE : AuditAction.CREATE;
      const changes: IAuditChange[] = [];

      if (action === AuditAction.CREATE) {
        // Log all fields for create, except ignored
        const obj = doc.toObject();
        for (const key of Object.keys(obj)) {
          if (!ignoredFields.includes(key) && key !== '_id') {
            changes.push({ field: key, newValue: obj[key] });
          }
        }
      } else {
        const original = doc.$locals.original || {};
        const current = doc.toObject();
        
        // Find modified paths (top level for simplicity, deep diff can be added for arrays)
        for (const key of Object.keys(current)) {
          if (ignoredFields.includes(key) || key === '_id') continue;
          
          if (!isEqual(original[key], current[key])) {
            changes.push({
              field: key,
              oldValue: original[key],
              newValue: current[key]
            });
          }
        }
        
        // Also check if any fields were deleted
        for (const key of Object.keys(original)) {
          if (ignoredFields.includes(key) || key === '_id') continue;
          if (current[key] === undefined && original[key] !== undefined) {
             changes.push({
               field: key,
               oldValue: original[key],
               newValue: null
             });
          }
        }
      }

      await createLog(doc._id, action, changes);
    } catch (err) {
      console.error('Audit plugin save error:', err);
    }
    next();
  });

  // --- FIND ONE AND UPDATE HOOKS ---
  schema.pre('findOneAndUpdate', async function (next) {
    try {
      const docToUpdate = await this.model.findOne(this.getQuery()).lean();
      this.$locals.original = docToUpdate;
    } catch (err) {
      console.warn('Audit plugin could not fetch original document for findOneAndUpdate');
    }
    next();
  });

  schema.post('findOneAndUpdate', async function (doc, next) {
    if (!doc) return next();
    
    try {
      const original = this.$locals.original || {};
      const current = doc.toObject ? doc.toObject() : doc;
      const changes: IAuditChange[] = [];
      
      // If it's a soft delete
      if (current.isDeleted === true && original.isDeleted !== true) {
        await createLog(doc._id, AuditAction.DELETE, [{ field: 'isDeleted', oldValue: false, newValue: true }]);
        return next();
      }

      for (const key of Object.keys(current)) {
        if (ignoredFields.includes(key) || key === '_id') continue;
        
        if (!isEqual(original[key], current[key])) {
          changes.push({
            field: key,
            oldValue: original[key],
            newValue: current[key]
          });
        }
      }

      for (const key of Object.keys(original)) {
        if (ignoredFields.includes(key) || key === '_id') continue;
        if (current[key] === undefined && original[key] !== undefined) {
           changes.push({
             field: key,
             oldValue: original[key],
             newValue: null
           });
        }
      }

      await createLog(doc._id, AuditAction.UPDATE, changes);
    } catch (err) {
      console.error('Audit plugin findOneAndUpdate error:', err);
    }
    next();
  });
  
  // --- DELETE HOOKS ---
  schema.pre('findOneAndDelete', async function (next) {
    try {
      const docToDelete = await this.model.findOne(this.getQuery()).lean();
      this.$locals.original = docToDelete;
    } catch (err) {
      console.warn('Audit plugin error in findOneAndDelete');
    }
    next();
  });

  schema.post('findOneAndDelete', async function (doc, next) {
    if (!doc) return next();
    try {
      const original = this.$locals.original || {};
      // For hard deletes, maybe we want to log the whole object, or just record DELETE
      await createLog(doc._id, AuditAction.DELETE, []);
    } catch (err) {
      console.error('Audit plugin findOneAndDelete error:', err);
    }
    next();
  });
  
  // Update Many (Bulk Updates)
  schema.post('updateMany', async function (res: any, next) {
    try {
       // We can't easily get all updated docs, so we record a bulk action
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
    next();
  });
}
