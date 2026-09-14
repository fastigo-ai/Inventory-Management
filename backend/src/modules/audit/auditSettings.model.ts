import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditSettings extends Document {
  entityName: string;
  isActive: boolean;
  trackAllFields: boolean;
  trackedFields: string[];
  ignoredFields: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AuditSettingsSchema = new Schema<IAuditSettings>({
  entityName: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: false }, // Default false for new entities so we don't blow up DB
  trackAllFields: { type: Boolean, default: true },
  trackedFields: [{ type: String }],
  ignoredFields: [{ type: String }],
}, {
  timestamps: true,
});

export const AuditSettings = mongoose.models.AuditSettings || mongoose.model<IAuditSettings>('AuditSettings', AuditSettingsSchema);

export default AuditSettings;
