import mongoose, { Schema, Document } from 'mongoose';

export interface IDILineItem {
  itemId?: mongoose.Types.ObjectId;
  loaSerialNo?: string;
  itemName: string;
  tempCode?: string;
  package?: string;
  circle?: string;
  quantity: number;
}

export interface IDI extends Document {
  diNumber: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  date: Date;
  circle?: string;
  package?: string;
  lineItems: IDILineItem[];
  status: 'Draft' | 'Active' | 'Cancelled';
  notes?: string;
  diLetterCopyUrl?: string;
  inspectionReportCopyUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const diLineItemSchema = new Schema<IDILineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  loaSerialNo: { type: String },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  package: { type: String },
  circle: { type: String },
  quantity: { type: Number, required: true, default: 0 },
});

const diSchema = new Schema<IDI>(
  {
    diNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    date: { type: Date, required: true, default: Date.now },
    circle: { type: String },
    package: { type: String },
    lineItems: [diLineItemSchema],
    status: { type: String, enum: ['Draft', 'Active', 'Cancelled'], default: 'Active' },
    notes: { type: String },
    diLetterCopyUrl: { type: String },
    inspectionReportCopyUrl: { type: String }
  },
  { timestamps: true }
);

import { auditPlugin } from '../../core/plugins/audit.plugin';
diSchema.plugin(auditPlugin, { entityName: 'DI', track: true });

export const DI = mongoose.models.DI || mongoose.model<IDI>('DI', diSchema);
