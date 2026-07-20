import mongoose, { Schema, Document } from 'mongoose';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  CANCEL = 'CANCEL',
  PRINT = 'PRINT',
  DOWNLOAD_PDF = 'DOWNLOAD_PDF',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  EMAIL = 'EMAIL',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE'
}

export interface IAuditChange {
  field: string;
  oldValue?: any;
  newValue?: any;
  message?: string;
}

export interface IAuditLog extends Document {
  companyId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  action: AuditAction;
  module?: string;
  requestId?: string;
  transactionId?: string;
  performedBy?: mongoose.Types.ObjectId;
  changes?: IAuditChange[];
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  route?: string;
  method?: string;
  createdAt: Date;
}

const AuditChangeSchema = new Schema<IAuditChange>({
  field: { type: String, required: true },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  message: { type: String }
}, { _id: false });

const AuditLogSchema = new Schema<IAuditLog>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, enum: Object.values(AuditAction), required: true },
  module: { type: String },
  requestId: { type: String },
  transactionId: { type: String },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  changes: [AuditChangeSchema],
  ip: { type: String },
  userAgent: { type: String },
  device: { type: String },
  browser: { type: String },
  os: { type: String },
  route: { type: String },
  method: { type: String }
}, { 
  timestamps: { createdAt: true, updatedAt: false } 
});

// Compound Indexes for high performance querying
AuditLogSchema.index({ companyId: 1, entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ requestId: 1 });
AuditLogSchema.index({ transactionId: 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
