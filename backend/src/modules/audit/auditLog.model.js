import mongoose, { Schema } from 'mongoose';
export var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["RESTORE"] = "RESTORE";
    AuditAction["APPROVE"] = "APPROVE";
    AuditAction["REJECT"] = "REJECT";
    AuditAction["SUBMIT"] = "SUBMIT";
    AuditAction["CANCEL"] = "CANCEL";
    AuditAction["PRINT"] = "PRINT";
    AuditAction["DOWNLOAD_PDF"] = "DOWNLOAD_PDF";
    AuditAction["EXPORT"] = "EXPORT";
    AuditAction["IMPORT"] = "IMPORT";
    AuditAction["EMAIL"] = "EMAIL";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["BULK_UPDATE"] = "BULK_UPDATE";
    AuditAction["BULK_DELETE"] = "BULK_DELETE";
})(AuditAction || (AuditAction = {}));
const AuditChangeSchema = new Schema({
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    message: { type: String }
}, { _id: false });
const AuditLogSchema = new Schema({
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
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
