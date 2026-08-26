import mongoose, { Schema, Document } from 'mongoose';

export enum AuditAction {
  // Data mutations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',

  // Workflow actions
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  CANCEL = 'CANCEL',
  FULFILL = 'FULFILL',
  VERIFY = 'VERIFY',

  // Document actions
  PRINT = 'PRINT',
  DOWNLOAD_PDF = 'DOWNLOAD_PDF',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  EMAIL = 'EMAIL',

  // User session
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',

  // UI interaction tracking
  VIEW = 'VIEW',
  CLICK = 'CLICK',
  NAVIGATE = 'NAVIGATE',
  SEARCH = 'SEARCH',
  FILTER = 'FILTER',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
  FORM_SUBMIT = 'FORM_SUBMIT',
  FORM_ERROR = 'FORM_ERROR',
  API_ERROR = 'API_ERROR',
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
  entityId?: mongoose.Types.ObjectId;
  action: AuditAction;
  module?: string;
  
  // Human-readable description of what happened
  description?: string;

  requestId?: string;
  transactionId?: string;
  performedBy?: mongoose.Types.ObjectId;
  changes?: IAuditChange[];

  // Request metadata
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  route?: string;
  method?: string;

  // UI context
  page?: string;
  component?: string;
  label?: string;
  status?: 'success' | 'failed';

  // Arbitrary extra data (e.g. search query, filter values, error messages)
  metadata?: Record<string, any>;

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
  entityId: { type: Schema.Types.ObjectId },
  action: { type: String, enum: Object.values(AuditAction), required: true },
  module: { type: String },
  description: { type: String },
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
  method: { type: String },
  page: { type: String },
  component: { type: String },
  label: { type: String },
  status: { type: String, enum: ['success', 'failed'] },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound Indexes for high performance querying
AuditLogSchema.index({ companyId: 1, entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ requestId: 1 });
AuditLogSchema.index({ transactionId: 1 });
AuditLogSchema.index({ createdAt: -1 });
// TTL index — auto-delete logs older than 1 year (365 days)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
