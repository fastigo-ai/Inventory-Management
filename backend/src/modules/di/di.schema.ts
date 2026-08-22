import mongoose, { Schema, Document } from 'mongoose';

export interface IDILineItem {
  itemId?: mongoose.Types.ObjectId;
  loaSerialNo?: string;
  itemName: string;
  tempCode?: string;
  package?: string;
  circle?: string;
  unit?: string;
  quantity: number;
  invoicedQuantity?: number;
}

export interface IDI extends Document {
  diNumber: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  poNumber?: string;
  vendorName?: string;
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
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', index: true },
  loaSerialNo: { type: String },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  package: { type: String },
  circle: { type: String },
  unit: { type: String },
  quantity: { type: Number, required: true, default: 0 },
  invoicedQuantity: { type: Number, default: 0 },
});

const diSchema = new Schema<IDI>(
  {
    diNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', index: true },
    poNumber: { type: String, index: true },
    vendorName: { type: String, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    circle: { type: String, index: true },
    package: { type: String },
    lineItems: [diLineItemSchema],
    status: { type: String, enum: ['Draft', 'Active', 'Cancelled'], default: 'Active', index: true },
    notes: { type: String },
    diLetterCopyUrl: { type: String },
    inspectionReportCopyUrl: { type: String }
  },
  { timestamps: true }
);

diSchema.index({ createdAt: -1 });

import { auditPlugin } from '../../core/plugins/audit.plugin';
diSchema.plugin(auditPlugin, { entityName: 'DI', track: true });

export const DI = mongoose.models.DI || mongoose.model<IDI>('DI', diSchema);
